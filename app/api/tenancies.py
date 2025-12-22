from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from app.core.database import get_db
from app.models.models import Tenancy, TenancyCheque, TenancyDocument, Property, CalendarBlock
from app.schemas.schemas import (
    TenancyCreate, TenancyUpdate, TenancyResponse, TenancyWithDetails,
    TenancyChequeCreate, TenancyChequeUpdate, TenancyChequeResponse,
    TenancyDocumentCreate, TenancyDocumentResponse, TenancyDocumentWithData,
    TenancyTerminate, TenancyRenew,
    UpcomingCheque, UpcomingChequesResponse,
    AnnualRevenueResponse
)

router = APIRouter(prefix="/tenancies", tags=["Tenancies"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_cheque_schedule(
    contract_start: date,
    annual_rent: Decimal,
    num_cheques: int
) -> list:
    """Auto-generate cheque schedule based on contract start and number of cheques."""
    cheque_amount = annual_rent / num_cheques
    cheques = []

    # Calculate interval between cheques
    if num_cheques == 1:
        months_interval = 12
    elif num_cheques == 2:
        months_interval = 6
    elif num_cheques == 3:
        months_interval = 4
    elif num_cheques == 4:
        months_interval = 3
    elif num_cheques == 6:
        months_interval = 2
    else:  # 12 cheques
        months_interval = 1

    for i in range(num_cheques):
        due_date = contract_start + relativedelta(months=i * months_interval)
        cheques.append({
            'cheque_number': f'CHQ-{i+1:02d}',
            'bank_name': 'TBD',
            'amount': cheque_amount,
            'due_date': due_date
        })

    return cheques


def create_calendar_block_for_tenancy(
    db: Session,
    property_id: UUID,
    tenancy_id: UUID,
    start_date: date,
    end_date: date
):
    """Create a calendar block for the tenancy period."""
    block_id = uuid4()
    sql = text("""
        INSERT INTO calendar_blocks (id, property_id, start_date, end_date, reason, description)
        VALUES (:id, :property_id, :start_date, :end_date, :reason, :description)
    """)
    db.execute(sql, {
        'id': block_id,
        'property_id': property_id,
        'start_date': start_date,
        'end_date': end_date,
        'reason': 'annual_tenancy',
        'description': f'Annual tenancy: {tenancy_id}'
    })


def remove_calendar_block_for_tenancy(db: Session, tenancy_id: UUID):
    """Remove calendar block associated with a tenancy."""
    sql = text("""
        DELETE FROM calendar_blocks
        WHERE reason = 'annual_tenancy'
        AND description LIKE :pattern
    """)
    db.execute(sql, {'pattern': f'%{tenancy_id}%'})


# ============================================================================
# TENANCY CRUD ENDPOINTS
# ============================================================================

@router.get("", response_model=List[TenancyWithDetails])
def get_tenancies(
    property_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all tenancies with optional filtering."""
    query = db.query(Tenancy)

    if property_id:
        query = query.filter(Tenancy.property_id == property_id)
    if status:
        query = query.filter(text(f"status::text = '{status}'"))

    tenancies = query.order_by(Tenancy.contract_start.desc()).offset(skip).limit(limit).all()

    # Enrich with details
    result = []
    for t in tenancies:
        property_obj = db.query(Property).filter(Property.id == t.property_id).first()
        cheques = db.query(TenancyCheque).filter(TenancyCheque.tenancy_id == t.id).order_by(TenancyCheque.due_date).all()
        documents = db.query(TenancyDocument).filter(TenancyDocument.tenancy_id == t.id).all()

        result.append(TenancyWithDetails(
            id=t.id,
            property_id=t.property_id,
            tenant_name=t.tenant_name,
            tenant_email=t.tenant_email,
            tenant_phone=t.tenant_phone,
            contract_start=t.contract_start,
            contract_end=t.contract_end,
            annual_rent=t.annual_rent,
            contract_value=t.contract_value,
            security_deposit=t.security_deposit,
            num_cheques=t.num_cheques,
            ejari_number=t.ejari_number,
            status=str(t.status),
            previous_tenancy_id=t.previous_tenancy_id,
            termination_date=t.termination_date,
            termination_reason=t.termination_reason,
            notes=t.notes,
            created_at=t.created_at,
            updated_at=t.updated_at,
            cheques=[TenancyChequeResponse.model_validate(c) for c in cheques],
            documents=[TenancyDocumentResponse.model_validate(d) for d in documents],
            property_name=property_obj.name if property_obj else None
        ))

    return result


@router.post("", response_model=TenancyWithDetails, status_code=status.HTTP_201_CREATED)
def create_tenancy(tenancy_data: TenancyCreate, db: Session = Depends(get_db)):
    """Create a new tenancy with auto-generated or manual cheque schedule."""

    # Validate property exists
    property_obj = db.query(Property).filter(Property.id == tenancy_data.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Check rental mode - cannot create annual tenancy for short-term rental property
    if property_obj.rental_mode == 'short_term':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create annual tenancy for short-term rental property. Change property rental mode first."
        )

    # Validate dates
    if tenancy_data.contract_end <= tenancy_data.contract_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract end must be after start")

    # Check for overlapping active tenancies
    overlap_check = text("""
        SELECT COUNT(*) FROM tenancies
        WHERE property_id = :property_id
        AND status = 'active'
        AND (
            (contract_start <= :end_date AND contract_end >= :start_date)
        )
    """)
    overlap_count = db.execute(overlap_check, {
        'property_id': tenancy_data.property_id,
        'start_date': tenancy_data.contract_start,
        'end_date': tenancy_data.contract_end
    }).scalar()

    if overlap_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property already has an active tenancy during this period"
        )

    tenancy_id = uuid4()

    # Insert tenancy using raw SQL for ENUM handling
    sql = text("""
        INSERT INTO tenancies (
            id, property_id, tenant_name, tenant_email, tenant_phone,
            contract_start, contract_end, annual_rent, contract_value,
            security_deposit, num_cheques, ejari_number, status, notes
        ) VALUES (
            :id, :property_id, :tenant_name, :tenant_email, :tenant_phone,
            :contract_start, :contract_end, :annual_rent, :contract_value,
            :security_deposit, :num_cheques, :ejari_number,
            CAST('active' AS tenancy_status), :notes
        )
    """)

    db.execute(sql, {
        'id': tenancy_id,
        'property_id': tenancy_data.property_id,
        'tenant_name': tenancy_data.tenant_name,
        'tenant_email': tenancy_data.tenant_email,
        'tenant_phone': tenancy_data.tenant_phone,
        'contract_start': tenancy_data.contract_start,
        'contract_end': tenancy_data.contract_end,
        'annual_rent': tenancy_data.annual_rent,
        'contract_value': tenancy_data.contract_value,
        'security_deposit': tenancy_data.security_deposit,
        'num_cheques': tenancy_data.num_cheques,
        'ejari_number': tenancy_data.ejari_number,
        'notes': tenancy_data.notes
    })

    # Create cheques - either from input or auto-generate
    if tenancy_data.cheques and len(tenancy_data.cheques) > 0:
        # Use manually provided cheques
        for cheque in tenancy_data.cheques:
            cheque_id = uuid4()
            cheque_sql = text("""
                INSERT INTO tenancy_cheques (
                    id, tenancy_id, cheque_number, bank_name, amount, due_date, status
                ) VALUES (
                    :id, :tenancy_id, :cheque_number, :bank_name, :amount, :due_date,
                    CAST('pending' AS cheque_status)
                )
            """)
            db.execute(cheque_sql, {
                'id': cheque_id,
                'tenancy_id': tenancy_id,
                'cheque_number': cheque.cheque_number,
                'bank_name': cheque.bank_name,
                'amount': cheque.amount,
                'due_date': cheque.due_date
            })
    elif tenancy_data.auto_split_cheques and tenancy_data.num_cheques > 0:
        # Auto-generate cheque schedule (skip if num_cheques = 0 for manual payments)
        cheques = calculate_cheque_schedule(
            tenancy_data.contract_start,
            tenancy_data.annual_rent,
            tenancy_data.num_cheques
        )
        for cheque in cheques:
            cheque_id = uuid4()
            cheque_sql = text("""
                INSERT INTO tenancy_cheques (
                    id, tenancy_id, cheque_number, bank_name, amount, due_date, status
                ) VALUES (
                    :id, :tenancy_id, :cheque_number, :bank_name, :amount, :due_date,
                    CAST('pending' AS cheque_status)
                )
            """)
            db.execute(cheque_sql, {
                'id': cheque_id,
                'tenancy_id': tenancy_id,
                'cheque_number': cheque['cheque_number'],
                'bank_name': cheque['bank_name'],
                'amount': cheque['amount'],
                'due_date': cheque['due_date']
            })

    # Create calendar block
    create_calendar_block_for_tenancy(
        db, tenancy_data.property_id, tenancy_id,
        tenancy_data.contract_start, tenancy_data.contract_end
    )

    db.commit()

    # Fetch and return the created tenancy with details
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    cheques = db.query(TenancyCheque).filter(TenancyCheque.tenancy_id == tenancy_id).order_by(TenancyCheque.due_date).all()

    return TenancyWithDetails(
        id=tenancy.id,
        property_id=tenancy.property_id,
        tenant_name=tenancy.tenant_name,
        tenant_email=tenancy.tenant_email,
        tenant_phone=tenancy.tenant_phone,
        contract_start=tenancy.contract_start,
        contract_end=tenancy.contract_end,
        annual_rent=tenancy.annual_rent,
        contract_value=tenancy.contract_value,
        security_deposit=tenancy.security_deposit,
        num_cheques=tenancy.num_cheques,
        ejari_number=tenancy.ejari_number,
        status=str(tenancy.status),
        previous_tenancy_id=tenancy.previous_tenancy_id,
        termination_date=tenancy.termination_date,
        termination_reason=tenancy.termination_reason,
        notes=tenancy.notes,
        created_at=tenancy.created_at,
        updated_at=tenancy.updated_at,
        cheques=[TenancyChequeResponse.model_validate(c) for c in cheques],
        documents=[],
        property_name=property_obj.name
    )


@router.get("/{tenancy_id}", response_model=TenancyWithDetails)
def get_tenancy(tenancy_id: UUID, db: Session = Depends(get_db)):
    """Get a single tenancy with all details."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    property_obj = db.query(Property).filter(Property.id == tenancy.property_id).first()
    cheques = db.query(TenancyCheque).filter(TenancyCheque.tenancy_id == tenancy_id).order_by(TenancyCheque.due_date).all()
    documents = db.query(TenancyDocument).filter(TenancyDocument.tenancy_id == tenancy_id).all()

    return TenancyWithDetails(
        id=tenancy.id,
        property_id=tenancy.property_id,
        tenant_name=tenancy.tenant_name,
        tenant_email=tenancy.tenant_email,
        tenant_phone=tenancy.tenant_phone,
        contract_start=tenancy.contract_start,
        contract_end=tenancy.contract_end,
        annual_rent=tenancy.annual_rent,
        contract_value=tenancy.contract_value,
        security_deposit=tenancy.security_deposit,
        num_cheques=tenancy.num_cheques,
        ejari_number=tenancy.ejari_number,
        status=str(tenancy.status),
        previous_tenancy_id=tenancy.previous_tenancy_id,
        termination_date=tenancy.termination_date,
        termination_reason=tenancy.termination_reason,
        notes=tenancy.notes,
        created_at=tenancy.created_at,
        updated_at=tenancy.updated_at,
        cheques=[TenancyChequeResponse.model_validate(c) for c in cheques],
        documents=[TenancyDocumentResponse.model_validate(d) for d in documents],
        property_name=property_obj.name if property_obj else None
    )


@router.put("/{tenancy_id}", response_model=TenancyResponse)
def update_tenancy(tenancy_id: UUID, tenancy_data: TenancyUpdate, db: Session = Depends(get_db)):
    """Update tenancy details."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    if str(tenancy.status) in ['terminated', 'renewed']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update terminated or renewed tenancy"
        )

    # Capture old values before updating
    old_num_cheques = tenancy.num_cheques
    old_annual_rent = tenancy.annual_rent
    old_contract_start = tenancy.contract_start

    update_data = tenancy_data.model_dump(exclude_unset=True)

    if update_data:
        set_clauses = []
        params = {'id': tenancy_id}

        for field, value in update_data.items():
            set_clauses.append(f"{field} = :{field}")
            params[field] = value

        sql = text(f"UPDATE tenancies SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id")
        db.execute(sql, params)

        # Update calendar block if dates changed
        if 'contract_start' in update_data or 'contract_end' in update_data:
            remove_calendar_block_for_tenancy(db, tenancy_id)
            new_start = update_data.get('contract_start', tenancy.contract_start)
            new_end = update_data.get('contract_end', tenancy.contract_end)
            create_calendar_block_for_tenancy(db, tenancy.property_id, tenancy_id, new_start, new_end)

        # Check if num_cheques changed - regenerate cheques if so
        new_num_cheques = update_data.get('num_cheques', old_num_cheques)
        if new_num_cheques != old_num_cheques:
            # Check for cleared cheques - cannot change if any are cleared
            cleared_count = db.query(TenancyCheque).filter(
                TenancyCheque.tenancy_id == tenancy_id,
                text("status::text = 'cleared'")
            ).count()

            if cleared_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change number of cheques - some cheques are already cleared"
                )

            # Delete existing cheques (pending/deposited/bounced)
            db.query(TenancyCheque).filter(TenancyCheque.tenancy_id == tenancy_id).delete()

            # Only regenerate cheques if new_num_cheques > 0 (0 = manual payments mode)
            if new_num_cheques > 0:
                # Get updated values for cheque generation
                new_annual_rent = update_data.get('annual_rent', old_annual_rent)
                new_contract_start = update_data.get('contract_start', old_contract_start)

                # Create new cheques using the schedule calculator
                cheque_schedule = calculate_cheque_schedule(
                    new_contract_start,
                    Decimal(str(new_annual_rent)),
                    new_num_cheques
                )

                for cheque_data in cheque_schedule:
                    cheque_id = uuid4()
                    cheque_sql = text("""
                        INSERT INTO tenancy_cheques (
                            id, tenancy_id, cheque_number, bank_name, amount, due_date, status
                        ) VALUES (
                            :id, :tenancy_id, :cheque_number, :bank_name, :amount, :due_date,
                            CAST('pending' AS cheque_status)
                        )
                    """)
                    db.execute(cheque_sql, {
                        'id': cheque_id,
                        'tenancy_id': tenancy_id,
                        'cheque_number': cheque_data['cheque_number'],
                        'bank_name': cheque_data['bank_name'],
                        'amount': cheque_data['amount'],
                        'due_date': cheque_data['due_date']
                    })

        db.commit()

    db.refresh(tenancy)
    return tenancy


@router.delete("/{tenancy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenancy(tenancy_id: UUID, db: Session = Depends(get_db)):
    """Delete a tenancy and all related data."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    # Remove calendar block
    remove_calendar_block_for_tenancy(db, tenancy_id)

    # Delete tenancy (cascades to cheques and documents)
    db.delete(tenancy)
    db.commit()
    return None


# ============================================================================
# TENANCY LIFECYCLE ENDPOINTS
# ============================================================================

@router.post("/{tenancy_id}/terminate", response_model=TenancyResponse)
def terminate_tenancy(tenancy_id: UUID, data: TenancyTerminate, db: Session = Depends(get_db)):
    """Terminate a tenancy early."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    if str(tenancy.status) != 'active':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active tenancies can be terminated"
        )

    sql = text("""
        UPDATE tenancies
        SET status = CAST('terminated' AS tenancy_status),
            termination_date = :termination_date,
            termination_reason = :termination_reason,
            updated_at = NOW()
        WHERE id = :id
    """)

    db.execute(sql, {
        'id': tenancy_id,
        'termination_date': data.termination_date,
        'termination_reason': data.termination_reason
    })

    # Update calendar block to reflect termination date
    remove_calendar_block_for_tenancy(db, tenancy_id)
    create_calendar_block_for_tenancy(
        db, tenancy.property_id, tenancy_id,
        tenancy.contract_start, data.termination_date
    )

    db.commit()
    db.refresh(tenancy)
    return tenancy


@router.post("/{tenancy_id}/renew", response_model=TenancyWithDetails)
def renew_tenancy(tenancy_id: UUID, data: TenancyRenew, db: Session = Depends(get_db)):
    """Renew a tenancy - creates new tenancy with same tenant info."""
    old_tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not old_tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    if str(old_tenancy.status) not in ['active', 'expired']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active or expired tenancies can be renewed"
        )

    property_obj = db.query(Property).filter(Property.id == old_tenancy.property_id).first()

    # Mark old tenancy as renewed
    sql = text("""
        UPDATE tenancies
        SET status = CAST('renewed' AS tenancy_status), updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': tenancy_id})

    # Create new tenancy
    new_tenancy_id = uuid4()
    new_sql = text("""
        INSERT INTO tenancies (
            id, property_id, tenant_name, tenant_email, tenant_phone,
            contract_start, contract_end, annual_rent, contract_value,
            security_deposit, num_cheques, ejari_number, status,
            previous_tenancy_id, notes
        ) VALUES (
            :id, :property_id, :tenant_name, :tenant_email, :tenant_phone,
            :contract_start, :contract_end, :annual_rent, :contract_value,
            :security_deposit, :num_cheques, :ejari_number,
            CAST('active' AS tenancy_status), :previous_tenancy_id, :notes
        )
    """)

    db.execute(new_sql, {
        'id': new_tenancy_id,
        'property_id': old_tenancy.property_id,
        'tenant_name': old_tenancy.tenant_name,
        'tenant_email': old_tenancy.tenant_email,
        'tenant_phone': old_tenancy.tenant_phone,
        'contract_start': data.contract_start,
        'contract_end': data.contract_end,
        'annual_rent': data.annual_rent,
        'contract_value': data.contract_value,
        'security_deposit': data.security_deposit,
        'num_cheques': data.num_cheques,
        'ejari_number': data.ejari_number,
        'previous_tenancy_id': tenancy_id,
        'notes': data.notes
    })

    # Create cheques for new tenancy
    if data.cheques and len(data.cheques) > 0:
        for cheque in data.cheques:
            cheque_id = uuid4()
            cheque_sql = text("""
                INSERT INTO tenancy_cheques (
                    id, tenancy_id, cheque_number, bank_name, amount, due_date, status
                ) VALUES (
                    :id, :tenancy_id, :cheque_number, :bank_name, :amount, :due_date,
                    CAST('pending' AS cheque_status)
                )
            """)
            db.execute(cheque_sql, {
                'id': cheque_id,
                'tenancy_id': new_tenancy_id,
                'cheque_number': cheque.cheque_number,
                'bank_name': cheque.bank_name,
                'amount': cheque.amount,
                'due_date': cheque.due_date
            })
    elif data.auto_split_cheques and data.num_cheques > 0:
        # Auto-generate cheque schedule (skip if num_cheques = 0 for manual payments)
        cheques = calculate_cheque_schedule(data.contract_start, data.annual_rent, data.num_cheques)
        for cheque in cheques:
            cheque_id = uuid4()
            cheque_sql = text("""
                INSERT INTO tenancy_cheques (
                    id, tenancy_id, cheque_number, bank_name, amount, due_date, status
                ) VALUES (
                    :id, :tenancy_id, :cheque_number, :bank_name, :amount, :due_date,
                    CAST('pending' AS cheque_status)
                )
            """)
            db.execute(cheque_sql, {
                'id': cheque_id,
                'tenancy_id': new_tenancy_id,
                'cheque_number': cheque['cheque_number'],
                'bank_name': cheque['bank_name'],
                'amount': cheque['amount'],
                'due_date': cheque['due_date']
            })

    # Create calendar block for new tenancy
    create_calendar_block_for_tenancy(
        db, old_tenancy.property_id, new_tenancy_id,
        data.contract_start, data.contract_end
    )

    db.commit()

    # Fetch and return new tenancy
    new_tenancy = db.query(Tenancy).filter(Tenancy.id == new_tenancy_id).first()
    cheques = db.query(TenancyCheque).filter(TenancyCheque.tenancy_id == new_tenancy_id).order_by(TenancyCheque.due_date).all()

    return TenancyWithDetails(
        id=new_tenancy.id,
        property_id=new_tenancy.property_id,
        tenant_name=new_tenancy.tenant_name,
        tenant_email=new_tenancy.tenant_email,
        tenant_phone=new_tenancy.tenant_phone,
        contract_start=new_tenancy.contract_start,
        contract_end=new_tenancy.contract_end,
        annual_rent=new_tenancy.annual_rent,
        contract_value=new_tenancy.contract_value,
        security_deposit=new_tenancy.security_deposit,
        num_cheques=new_tenancy.num_cheques,
        ejari_number=new_tenancy.ejari_number,
        status=str(new_tenancy.status),
        previous_tenancy_id=new_tenancy.previous_tenancy_id,
        termination_date=new_tenancy.termination_date,
        termination_reason=new_tenancy.termination_reason,
        notes=new_tenancy.notes,
        created_at=new_tenancy.created_at,
        updated_at=new_tenancy.updated_at,
        cheques=[TenancyChequeResponse.model_validate(c) for c in cheques],
        documents=[],
        property_name=property_obj.name if property_obj else None
    )


# ============================================================================
# CHEQUE MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/{tenancy_id}/cheques", response_model=List[TenancyChequeResponse])
def get_tenancy_cheques(tenancy_id: UUID, db: Session = Depends(get_db)):
    """Get all cheques for a tenancy."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    cheques = db.query(TenancyCheque).filter(
        TenancyCheque.tenancy_id == tenancy_id
    ).order_by(TenancyCheque.due_date).all()

    return cheques


@router.post("/{tenancy_id}/cheques", response_model=TenancyChequeResponse, status_code=status.HTTP_201_CREATED)
def add_payment(
    tenancy_id: UUID,
    payment_data: TenancyChequeCreate,
    db: Session = Depends(get_db)
):
    """Add a new payment (cheque, bank transfer, or cash) to a tenancy."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    payment_id = uuid4()

    sql = text("""
        INSERT INTO tenancy_cheques (
            id, tenancy_id, payment_method, cheque_number, bank_name,
            reference_number, amount, due_date, status, notes
        ) VALUES (
            :id, :tenancy_id, :payment_method, :cheque_number, :bank_name,
            :reference_number, :amount, :due_date,
            CAST(:status AS cheque_status), :notes
        )
    """)

    db.execute(sql, {
        'id': payment_id,
        'tenancy_id': tenancy_id,
        'payment_method': payment_data.payment_method,
        'cheque_number': payment_data.cheque_number,
        'bank_name': payment_data.bank_name,
        'reference_number': payment_data.reference_number,
        'amount': payment_data.amount,
        'due_date': payment_data.due_date,
        'status': payment_data.status or 'pending',
        'notes': payment_data.notes
    })
    db.commit()

    payment = db.query(TenancyCheque).filter(TenancyCheque.id == payment_id).first()
    return payment


@router.put("/{tenancy_id}/cheques/{cheque_id}", response_model=TenancyChequeResponse)
def update_cheque(
    tenancy_id: UUID,
    cheque_id: UUID,
    cheque_data: TenancyChequeUpdate,
    db: Session = Depends(get_db)
):
    """Update a cheque (status, dates, etc.)."""
    cheque = db.query(TenancyCheque).filter(
        TenancyCheque.id == cheque_id,
        TenancyCheque.tenancy_id == tenancy_id
    ).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    update_data = cheque_data.model_dump(exclude_unset=True)

    if update_data:
        set_clauses = []
        params = {'id': cheque_id}

        for field, value in update_data.items():
            if field == 'status':
                set_clauses.append(f"status = CAST(:{field} AS cheque_status)")
            else:
                set_clauses.append(f"{field} = :{field}")
            params[field] = value

        sql = text(f"UPDATE tenancy_cheques SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id")
        db.execute(sql, params)
        db.commit()

    db.refresh(cheque)
    return cheque


@router.post("/{tenancy_id}/cheques/{cheque_id}/deposit", response_model=TenancyChequeResponse)
def deposit_cheque(tenancy_id: UUID, cheque_id: UUID, db: Session = Depends(get_db)):
    """Mark a cheque as deposited."""
    cheque = db.query(TenancyCheque).filter(
        TenancyCheque.id == cheque_id,
        TenancyCheque.tenancy_id == tenancy_id
    ).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    if str(cheque.status) != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending cheques can be deposited"
        )

    sql = text("""
        UPDATE tenancy_cheques
        SET status = CAST('deposited' AS cheque_status),
            deposited_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': cheque_id})
    db.commit()
    db.refresh(cheque)
    return cheque


@router.post("/{tenancy_id}/cheques/{cheque_id}/clear", response_model=TenancyChequeResponse)
def clear_cheque(tenancy_id: UUID, cheque_id: UUID, db: Session = Depends(get_db)):
    """Mark a cheque as cleared."""
    cheque = db.query(TenancyCheque).filter(
        TenancyCheque.id == cheque_id,
        TenancyCheque.tenancy_id == tenancy_id
    ).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    if str(cheque.status) != 'deposited':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only deposited cheques can be cleared"
        )

    sql = text("""
        UPDATE tenancy_cheques
        SET status = CAST('cleared' AS cheque_status),
            cleared_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': cheque_id})
    db.commit()
    db.refresh(cheque)
    return cheque


@router.post("/{tenancy_id}/cheques/{cheque_id}/bounce", response_model=TenancyChequeResponse)
def bounce_cheque(
    tenancy_id: UUID,
    cheque_id: UUID,
    reason: str = "Insufficient funds",
    db: Session = Depends(get_db)
):
    """Mark a cheque as bounced."""
    cheque = db.query(TenancyCheque).filter(
        TenancyCheque.id == cheque_id,
        TenancyCheque.tenancy_id == tenancy_id
    ).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    if str(cheque.status) != 'deposited':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only deposited cheques can bounce"
        )

    sql = text("""
        UPDATE tenancy_cheques
        SET status = CAST('bounced' AS cheque_status),
            bounce_reason = :reason,
            updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': cheque_id, 'reason': reason})
    db.commit()
    db.refresh(cheque)
    return cheque


# ============================================================================
# DIRECT CHEQUE OPERATIONS (by cheque ID only)
# ============================================================================

@router.post("/cheques/{cheque_id}/deposit", response_model=TenancyChequeResponse)
def deposit_cheque_direct(
    cheque_id: UUID,
    data: dict,
    db: Session = Depends(get_db)
):
    """Mark a cheque as deposited (direct access by cheque ID)."""
    cheque = db.query(TenancyCheque).filter(TenancyCheque.id == cheque_id).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    if str(cheque.status) != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending cheques can be deposited"
        )

    deposited_date = data.get('deposited_date', date.today().isoformat())

    sql = text("""
        UPDATE tenancy_cheques
        SET status = CAST('deposited' AS cheque_status),
            deposited_date = :deposited_date,
            updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': cheque_id, 'deposited_date': deposited_date})
    db.commit()
    db.refresh(cheque)
    return cheque


@router.post("/cheques/{cheque_id}/clear", response_model=TenancyChequeResponse)
def clear_cheque_direct(
    cheque_id: UUID,
    data: dict,
    db: Session = Depends(get_db)
):
    """Mark a cheque as cleared (direct access by cheque ID)."""
    cheque = db.query(TenancyCheque).filter(TenancyCheque.id == cheque_id).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    if str(cheque.status) != 'deposited':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only deposited cheques can be cleared"
        )

    cleared_date = data.get('cleared_date', date.today().isoformat())

    sql = text("""
        UPDATE tenancy_cheques
        SET status = CAST('cleared' AS cheque_status),
            cleared_date = :cleared_date,
            updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': cheque_id, 'cleared_date': cleared_date})
    db.commit()
    db.refresh(cheque)
    return cheque


@router.post("/cheques/{cheque_id}/bounce", response_model=TenancyChequeResponse)
def bounce_cheque_direct(
    cheque_id: UUID,
    data: dict,
    db: Session = Depends(get_db)
):
    """Mark a cheque as bounced (direct access by cheque ID)."""
    cheque = db.query(TenancyCheque).filter(TenancyCheque.id == cheque_id).first()

    if not cheque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")

    if str(cheque.status) != 'deposited':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only deposited cheques can bounce"
        )

    bounce_reason = data.get('bounce_reason', 'Insufficient funds')

    sql = text("""
        UPDATE tenancy_cheques
        SET status = CAST('bounced' AS cheque_status),
            bounce_reason = :reason,
            updated_at = NOW()
        WHERE id = :id
    """)
    db.execute(sql, {'id': cheque_id, 'reason': bounce_reason})
    db.commit()
    db.refresh(cheque)
    return cheque


# ============================================================================
# DIRECT DOCUMENT OPERATIONS (by document ID only)
# ============================================================================

@router.get("/documents/{document_id}", response_model=TenancyDocumentWithData)
def get_document_direct(document_id: UUID, db: Session = Depends(get_db)):
    """Get a specific document with file data (direct access by document ID)."""
    document = db.query(TenancyDocument).filter(TenancyDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return document


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document_direct(document_id: UUID, db: Session = Depends(get_db)):
    """Delete a document (direct access by document ID)."""
    document = db.query(TenancyDocument).filter(TenancyDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    db.delete(document)
    db.commit()
    return None


# ============================================================================
# DOCUMENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/{tenancy_id}/documents", response_model=List[TenancyDocumentResponse])
def get_tenancy_documents(tenancy_id: UUID, db: Session = Depends(get_db)):
    """Get all documents for a tenancy (without file data)."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    documents = db.query(TenancyDocument).filter(TenancyDocument.tenancy_id == tenancy_id).all()
    return documents


@router.post("/{tenancy_id}/documents", response_model=TenancyDocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(tenancy_id: UUID, doc_data: TenancyDocumentCreate, db: Session = Depends(get_db)):
    """Upload a document for a tenancy."""
    tenancy = db.query(Tenancy).filter(Tenancy.id == tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenancy not found")

    doc_id = uuid4()
    sql = text("""
        INSERT INTO tenancy_documents (
            id, tenancy_id, document_type, filename, file_data, file_size, mime_type
        ) VALUES (
            :id, :tenancy_id, CAST(:document_type AS document_type),
            :filename, :file_data, :file_size, :mime_type
        )
    """)

    db.execute(sql, {
        'id': doc_id,
        'tenancy_id': tenancy_id,
        'document_type': doc_data.document_type,
        'filename': doc_data.filename,
        'file_data': doc_data.file_data,
        'file_size': doc_data.file_size,
        'mime_type': doc_data.mime_type
    })
    db.commit()

    document = db.query(TenancyDocument).filter(TenancyDocument.id == doc_id).first()
    return document


@router.get("/{tenancy_id}/documents/{document_id}", response_model=TenancyDocumentWithData)
def get_document(tenancy_id: UUID, document_id: UUID, db: Session = Depends(get_db)):
    """Get a specific document with file data."""
    document = db.query(TenancyDocument).filter(
        TenancyDocument.id == document_id,
        TenancyDocument.tenancy_id == tenancy_id
    ).first()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return document


@router.delete("/{tenancy_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(tenancy_id: UUID, document_id: UUID, db: Session = Depends(get_db)):
    """Delete a document."""
    document = db.query(TenancyDocument).filter(
        TenancyDocument.id == document_id,
        TenancyDocument.tenancy_id == tenancy_id
    ).first()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    db.delete(document)
    db.commit()
    return None


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboard/upcoming-cheques", response_model=UpcomingChequesResponse)
def get_upcoming_cheques(
    property_id: Optional[UUID] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get upcoming cheques due within specified days."""
    today = date.today()
    end_date = today + timedelta(days=days)

    sql = text("""
        SELECT
            c.id, c.tenancy_id, t.property_id, p.name as property_name,
            t.tenant_name, c.payment_method, c.cheque_number, c.bank_name,
            c.reference_number, c.amount, c.due_date, c.status::text as status
        FROM tenancy_cheques c
        JOIN tenancies t ON c.tenancy_id = t.id
        JOIN properties p ON t.property_id = p.id
        WHERE c.status = 'pending'
        AND c.due_date BETWEEN :today AND :end_date
        AND t.status = 'active'
        """ + (f" AND t.property_id = :property_id" if property_id else "") + """
        ORDER BY c.due_date ASC
    """)

    params = {'today': today, 'end_date': end_date}
    if property_id:
        params['property_id'] = property_id

    result = db.execute(sql, params).fetchall()

    cheques = []
    total_amount = Decimal('0')

    for row in result:
        days_until = (row.due_date - today).days
        cheques.append(UpcomingCheque(
            id=row.id,
            tenancy_id=row.tenancy_id,
            property_id=row.property_id,
            property_name=row.property_name,
            tenant_name=row.tenant_name,
            payment_method=row.payment_method or 'cheque',
            cheque_number=row.cheque_number,
            bank_name=row.bank_name,
            reference_number=row.reference_number,
            amount=row.amount,
            due_date=row.due_date,
            status=row.status,
            days_until_due=days_until
        ))
        total_amount += row.amount

    return UpcomingChequesResponse(
        cheques=cheques,
        total_amount=total_amount,
        count=len(cheques)
    )


# ============================================================================
# ANNUAL REVENUE ENDPOINT
# ============================================================================

@router.get("/dashboard/annual-revenue", response_model=AnnualRevenueResponse)
def get_annual_revenue(
    property_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get annual tenancy revenue summary."""

    # Build property filter
    property_filter = "AND t.property_id = :property_id" if property_id else ""

    # Build date filter for contract overlap
    date_filter = ""
    if start_date and end_date:
        date_filter = """
            AND (
                (t.contract_start <= :end_date AND t.contract_end >= :start_date)
            )
        """

    # Get cleared cheque amounts
    cleared_sql = text(f"""
        SELECT COALESCE(SUM(c.amount), 0) as total
        FROM tenancy_cheques c
        JOIN tenancies t ON c.tenancy_id = t.id
        WHERE c.status = 'cleared'
        {property_filter}
        {date_filter}
    """)

    # Get pending cheque amounts
    pending_sql = text(f"""
        SELECT COALESCE(SUM(c.amount), 0) as total
        FROM tenancy_cheques c
        JOIN tenancies t ON c.tenancy_id = t.id
        WHERE c.status IN ('pending', 'deposited')
        AND t.status = 'active'
        {property_filter}
        {date_filter}
    """)

    # Get total contract value
    contract_sql = text(f"""
        SELECT COALESCE(SUM(t.contract_value), 0) as total
        FROM tenancies t
        WHERE t.status = 'active'
        {property_filter}
        {date_filter}
    """)

    # Get active tenancy count
    count_sql = text(f"""
        SELECT COUNT(*) as count
        FROM tenancies t
        WHERE t.status = 'active'
        {property_filter}
        {date_filter}
    """)

    params = {}
    if property_id:
        params['property_id'] = property_id
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date

    cleared = db.execute(cleared_sql, params).scalar() or Decimal('0')
    pending = db.execute(pending_sql, params).scalar() or Decimal('0')
    contract_value = db.execute(contract_sql, params).scalar() or Decimal('0')
    active_count = db.execute(count_sql, params).scalar() or 0

    return AnnualRevenueResponse(
        total_cleared=cleared,
        total_pending=pending,
        total_contract_value=contract_value,
        active_tenancies=active_count
    )
