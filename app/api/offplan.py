from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.models.models import OffplanProperty, OffplanPayment, OffplanDocument
from app.schemas.schemas import (
    OffplanPropertyCreate, OffplanPropertyUpdate, OffplanPropertyResponse, OffplanPropertyWithDetails,
    OffplanPaymentCreate, OffplanPaymentUpdate, OffplanPaymentResponse,
    OffplanDocumentCreate, OffplanDocumentResponse, OffplanDocumentWithData,
    UpcomingOffplanPayment, UpcomingOffplanPaymentsResponse,
    OffplanInvestmentSummary
)

router = APIRouter(prefix="/offplan", tags=["Off-Plan Properties"])


# ============================================================================
# OFF-PLAN PROPERTY CRUD ENDPOINTS
# ============================================================================

@router.get("/properties", response_model=List[OffplanPropertyWithDetails])
def get_offplan_properties(
    status: Optional[str] = None,
    emirate: Optional[str] = None,
    developer: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all off-plan properties with optional filtering."""
    query = db.query(OffplanProperty)

    if status:
        query = query.filter(text(f"status::text = '{status}'"))
    if emirate:
        query = query.filter(text(f"emirate::text = '{emirate}'"))
    if developer:
        query = query.filter(OffplanProperty.developer.ilike(f"%{developer}%"))

    properties = query.order_by(OffplanProperty.purchase_date.desc()).offset(skip).limit(limit).all()

    # Enrich with details
    result = []
    for prop in properties:
        payments = db.query(OffplanPayment).filter(OffplanPayment.offplan_property_id == prop.id).order_by(OffplanPayment.due_date).all()
        documents = db.query(OffplanDocument).filter(OffplanDocument.offplan_property_id == prop.id).all()

        result.append(OffplanPropertyWithDetails(
            id=prop.id,
            developer=prop.developer,
            project_name=prop.project_name,
            unit_number=prop.unit_number,
            reference_number=prop.reference_number,
            unit_type=prop.unit_type,
            unit_model=prop.unit_model,
            internal_area_sqm=prop.internal_area_sqm,
            balcony_area_sqm=prop.balcony_area_sqm,
            total_area_sqm=prop.total_area_sqm,
            floor_number=prop.floor_number,
            building_number=prop.building_number,
            bedrooms=prop.bedrooms,
            bathrooms=prop.bathrooms,
            parking_spots=prop.parking_spots,
            emirate=str(prop.emirate),
            area=prop.area,
            community=prop.community,
            base_price=prop.base_price,
            land_dept_fee_percent=prop.land_dept_fee_percent,
            land_dept_fee=prop.land_dept_fee,
            admin_fees=prop.admin_fees,
            other_fees=prop.other_fees,
            total_cost=prop.total_cost,
            purchase_date=prop.purchase_date,
            expected_handover=prop.expected_handover,
            actual_handover=prop.actual_handover,
            status=str(prop.status),
            converted_property_id=prop.converted_property_id,
            promotion_name=prop.promotion_name,
            amc_waiver_years=prop.amc_waiver_years,
            dlp_waiver_years=prop.dlp_waiver_years,
            notes=prop.notes,
            created_at=prop.created_at,
            updated_at=prop.updated_at,
            payments=[OffplanPaymentResponse.model_validate(p) for p in payments],
            documents=[OffplanDocumentResponse.model_validate(d) for d in documents]
        ))

    return result


@router.post("/properties", response_model=OffplanPropertyWithDetails, status_code=status.HTTP_201_CREATED)
def create_offplan_property(property_data: OffplanPropertyCreate, db: Session = Depends(get_db)):
    """Create a new off-plan property."""
    property_id = uuid4()

    sql = text("""
        INSERT INTO offplan_properties (
            id, developer, project_name, unit_number, reference_number,
            unit_type, unit_model, internal_area_sqm, balcony_area_sqm, total_area_sqm,
            floor_number, building_number, bedrooms, bathrooms, parking_spots,
            emirate, area, community,
            base_price, land_dept_fee_percent, land_dept_fee, admin_fees, other_fees, total_cost,
            purchase_date, expected_handover, actual_handover,
            status, converted_property_id, promotion_name, amc_waiver_years, dlp_waiver_years, notes
        ) VALUES (
            :id, :developer, :project_name, :unit_number, :reference_number,
            :unit_type, :unit_model, :internal_area_sqm, :balcony_area_sqm, :total_area_sqm,
            :floor_number, :building_number, :bedrooms, :bathrooms, :parking_spots,
            CAST(:emirate AS emirate_type), :area, :community,
            :base_price, :land_dept_fee_percent, :land_dept_fee, :admin_fees, :other_fees, :total_cost,
            :purchase_date, :expected_handover, :actual_handover,
            CAST(:status AS offplan_status), :converted_property_id, :promotion_name, :amc_waiver_years, :dlp_waiver_years, :notes
        )
    """)

    db.execute(sql, {
        'id': property_id,
        'developer': property_data.developer,
        'project_name': property_data.project_name,
        'unit_number': property_data.unit_number,
        'reference_number': property_data.reference_number,
        'unit_type': property_data.unit_type,
        'unit_model': property_data.unit_model,
        'internal_area_sqm': property_data.internal_area_sqm,
        'balcony_area_sqm': property_data.balcony_area_sqm,
        'total_area_sqm': property_data.total_area_sqm,
        'floor_number': property_data.floor_number,
        'building_number': property_data.building_number,
        'bedrooms': property_data.bedrooms,
        'bathrooms': property_data.bathrooms,
        'parking_spots': property_data.parking_spots,
        'emirate': property_data.emirate,
        'area': property_data.area,
        'community': property_data.community,
        'base_price': property_data.base_price,
        'land_dept_fee_percent': property_data.land_dept_fee_percent,
        'land_dept_fee': property_data.land_dept_fee,
        'admin_fees': property_data.admin_fees,
        'other_fees': property_data.other_fees,
        'total_cost': property_data.total_cost,
        'purchase_date': property_data.purchase_date,
        'expected_handover': property_data.expected_handover,
        'actual_handover': property_data.actual_handover,
        'status': property_data.status,
        'converted_property_id': property_data.converted_property_id,
        'promotion_name': property_data.promotion_name,
        'amc_waiver_years': property_data.amc_waiver_years,
        'dlp_waiver_years': property_data.dlp_waiver_years,
        'notes': property_data.notes
    })
    db.commit()

    # Fetch and return the created property
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    return OffplanPropertyWithDetails(
        id=prop.id,
        developer=prop.developer,
        project_name=prop.project_name,
        unit_number=prop.unit_number,
        reference_number=prop.reference_number,
        unit_type=prop.unit_type,
        unit_model=prop.unit_model,
        internal_area_sqm=prop.internal_area_sqm,
        balcony_area_sqm=prop.balcony_area_sqm,
        total_area_sqm=prop.total_area_sqm,
        floor_number=prop.floor_number,
        building_number=prop.building_number,
        bedrooms=prop.bedrooms,
        bathrooms=prop.bathrooms,
        parking_spots=prop.parking_spots,
        emirate=str(prop.emirate),
        area=prop.area,
        community=prop.community,
        base_price=prop.base_price,
        land_dept_fee_percent=prop.land_dept_fee_percent,
        land_dept_fee=prop.land_dept_fee,
        admin_fees=prop.admin_fees,
        other_fees=prop.other_fees,
        total_cost=prop.total_cost,
        purchase_date=prop.purchase_date,
        expected_handover=prop.expected_handover,
        actual_handover=prop.actual_handover,
        status=str(prop.status),
        converted_property_id=prop.converted_property_id,
        promotion_name=prop.promotion_name,
        amc_waiver_years=prop.amc_waiver_years,
        dlp_waiver_years=prop.dlp_waiver_years,
        notes=prop.notes,
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        payments=[],
        documents=[]
    )


@router.get("/properties/{property_id}", response_model=OffplanPropertyWithDetails)
def get_offplan_property(property_id: UUID, db: Session = Depends(get_db)):
    """Get a single off-plan property with all details."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    payments = db.query(OffplanPayment).filter(OffplanPayment.offplan_property_id == property_id).order_by(OffplanPayment.due_date).all()
    documents = db.query(OffplanDocument).filter(OffplanDocument.offplan_property_id == property_id).all()

    return OffplanPropertyWithDetails(
        id=prop.id,
        developer=prop.developer,
        project_name=prop.project_name,
        unit_number=prop.unit_number,
        reference_number=prop.reference_number,
        unit_type=prop.unit_type,
        unit_model=prop.unit_model,
        internal_area_sqm=prop.internal_area_sqm,
        balcony_area_sqm=prop.balcony_area_sqm,
        total_area_sqm=prop.total_area_sqm,
        floor_number=prop.floor_number,
        building_number=prop.building_number,
        bedrooms=prop.bedrooms,
        bathrooms=prop.bathrooms,
        parking_spots=prop.parking_spots,
        emirate=str(prop.emirate),
        area=prop.area,
        community=prop.community,
        base_price=prop.base_price,
        land_dept_fee_percent=prop.land_dept_fee_percent,
        land_dept_fee=prop.land_dept_fee,
        admin_fees=prop.admin_fees,
        other_fees=prop.other_fees,
        total_cost=prop.total_cost,
        purchase_date=prop.purchase_date,
        expected_handover=prop.expected_handover,
        actual_handover=prop.actual_handover,
        status=str(prop.status),
        converted_property_id=prop.converted_property_id,
        promotion_name=prop.promotion_name,
        amc_waiver_years=prop.amc_waiver_years,
        dlp_waiver_years=prop.dlp_waiver_years,
        notes=prop.notes,
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        payments=[OffplanPaymentResponse.model_validate(p) for p in payments],
        documents=[OffplanDocumentResponse.model_validate(d) for d in documents]
    )


@router.put("/properties/{property_id}", response_model=OffplanPropertyResponse)
def update_offplan_property(property_id: UUID, property_data: OffplanPropertyUpdate, db: Session = Depends(get_db)):
    """Update off-plan property details."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    update_data = property_data.model_dump(exclude_unset=True)

    if update_data:
        set_clauses = []
        params = {'id': property_id}

        for field, value in update_data.items():
            if field == 'status':
                set_clauses.append(f"status = CAST(:{field} AS offplan_status)")
            elif field == 'emirate':
                set_clauses.append(f"emirate = CAST(:{field} AS emirate_type)")
            else:
                set_clauses.append(f"{field} = :{field}")
            params[field] = value

        sql = text(f"UPDATE offplan_properties SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id")
        db.execute(sql, params)
        db.commit()

    db.refresh(prop)
    return prop


@router.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offplan_property(property_id: UUID, db: Session = Depends(get_db)):
    """Delete an off-plan property and all related data."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    db.delete(prop)
    db.commit()
    return None


# ============================================================================
# PAYMENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/properties/{property_id}/payments", response_model=List[OffplanPaymentResponse])
def get_property_payments(property_id: UUID, db: Session = Depends(get_db)):
    """Get all payments for an off-plan property."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    payments = db.query(OffplanPayment).filter(
        OffplanPayment.offplan_property_id == property_id
    ).order_by(OffplanPayment.due_date).all()

    return payments


@router.post("/properties/{property_id}/payments", response_model=OffplanPaymentResponse, status_code=status.HTTP_201_CREATED)
def add_payment(
    property_id: UUID,
    payment_data: OffplanPaymentCreate,
    db: Session = Depends(get_db)
):
    """Add a new payment to an off-plan property."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    payment_id = uuid4()

    sql = text("""
        INSERT INTO offplan_payments (
            id, offplan_property_id, installment_number, milestone_name,
            percentage, amount, due_date, status, notes
        ) VALUES (
            :id, :offplan_property_id, :installment_number, :milestone_name,
            :percentage, :amount, :due_date, CAST(:status AS offplan_payment_status), :notes
        )
    """)

    db.execute(sql, {
        'id': payment_id,
        'offplan_property_id': property_id,
        'installment_number': payment_data.installment_number,
        'milestone_name': payment_data.milestone_name,
        'percentage': payment_data.percentage,
        'amount': payment_data.amount,
        'due_date': payment_data.due_date,
        'status': payment_data.status or 'pending',
        'notes': payment_data.notes
    })
    db.commit()

    payment = db.query(OffplanPayment).filter(OffplanPayment.id == payment_id).first()
    return payment


@router.put("/payments/{payment_id}", response_model=OffplanPaymentResponse)
def update_payment(
    payment_id: UUID,
    payment_data: OffplanPaymentUpdate,
    db: Session = Depends(get_db)
):
    """Update a payment."""
    payment = db.query(OffplanPayment).filter(OffplanPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    update_data = payment_data.model_dump(exclude_unset=True)

    if update_data:
        set_clauses = []
        params = {'id': payment_id}

        for field, value in update_data.items():
            if field == 'status':
                set_clauses.append(f"status = CAST(:{field} AS offplan_payment_status)")
            else:
                set_clauses.append(f"{field} = :{field}")
            params[field] = value

        sql = text(f"UPDATE offplan_payments SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id")
        db.execute(sql, params)
        db.commit()

    db.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(payment_id: UUID, db: Session = Depends(get_db)):
    """Delete a payment."""
    payment = db.query(OffplanPayment).filter(OffplanPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    db.delete(payment)
    db.commit()
    return None


@router.post("/payments/{payment_id}/mark-paid", response_model=OffplanPaymentResponse)
def mark_payment_paid(
    payment_id: UUID,
    paid_date: date = Query(...),
    paid_amount: Decimal = Query(...),
    payment_method: str = Query(...),
    payment_reference: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Mark a payment as paid with payment details."""
    payment = db.query(OffplanPayment).filter(OffplanPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    sql = text("""
        UPDATE offplan_payments
        SET status = CAST('paid' AS offplan_payment_status),
            paid_date = :paid_date,
            paid_amount = :paid_amount,
            payment_method = :payment_method,
            payment_reference = :payment_reference,
            updated_at = NOW()
        WHERE id = :id
    """)

    db.execute(sql, {
        'id': payment_id,
        'paid_date': paid_date,
        'paid_amount': paid_amount,
        'payment_method': payment_method,
        'payment_reference': payment_reference
    })
    db.commit()
    db.refresh(payment)
    return payment


# ============================================================================
# DOCUMENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/properties/{property_id}/documents", response_model=List[OffplanDocumentResponse])
def get_property_documents(property_id: UUID, db: Session = Depends(get_db)):
    """Get all documents for an off-plan property (without file data)."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    documents = db.query(OffplanDocument).filter(OffplanDocument.offplan_property_id == property_id).all()
    return documents


@router.post("/properties/{property_id}/documents", response_model=OffplanDocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(property_id: UUID, doc_data: OffplanDocumentCreate, db: Session = Depends(get_db)):
    """Upload a document for an off-plan property."""
    prop = db.query(OffplanProperty).filter(OffplanProperty.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Off-plan property not found")

    doc_id = uuid4()
    sql = text("""
        INSERT INTO offplan_documents (
            id, offplan_property_id, document_type, document_name, file_data, file_size, mime_type
        ) VALUES (
            :id, :offplan_property_id, :document_type, :document_name, :file_data, :file_size, :mime_type
        )
    """)

    db.execute(sql, {
        'id': doc_id,
        'offplan_property_id': property_id,
        'document_type': doc_data.document_type,
        'document_name': doc_data.document_name,
        'file_data': doc_data.file_data,
        'file_size': doc_data.file_size,
        'mime_type': doc_data.mime_type
    })
    db.commit()

    document = db.query(OffplanDocument).filter(OffplanDocument.id == doc_id).first()
    return document


@router.get("/documents/{document_id}", response_model=OffplanDocumentWithData)
def get_document(document_id: UUID, db: Session = Depends(get_db)):
    """Get a specific document with file data."""
    document = db.query(OffplanDocument).filter(OffplanDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return document


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: UUID, db: Session = Depends(get_db)):
    """Delete a document."""
    document = db.query(OffplanDocument).filter(OffplanDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    db.delete(document)
    db.commit()
    return None


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboard/upcoming-payments", response_model=UpcomingOffplanPaymentsResponse)
def get_upcoming_payments(
    days: int = Query(30),
    db: Session = Depends(get_db)
):
    """Get upcoming off-plan payments due within specified days."""
    today = date.today()
    end_date = today + timedelta(days=days)

    sql = text("""
        SELECT
            p.id, p.offplan_property_id as property_id,
            o.developer, o.project_name, o.unit_number,
            p.milestone_name, p.amount, p.due_date, p.status::text as status
        FROM offplan_payments p
        JOIN offplan_properties o ON p.offplan_property_id = o.id
        WHERE p.status IN ('pending', 'overdue')
        AND p.due_date BETWEEN :today AND :end_date
        AND o.status = 'active'
        ORDER BY p.due_date ASC
    """)

    result = db.execute(sql, {'today': today, 'end_date': end_date}).fetchall()

    payments = []
    total_amount = Decimal('0')

    for row in result:
        days_until = (row.due_date - today).days
        payments.append(UpcomingOffplanPayment(
            id=row.id,
            property_id=row.property_id,
            developer=row.developer,
            project_name=row.project_name,
            unit_number=row.unit_number,
            milestone_name=row.milestone_name,
            amount=row.amount,
            due_date=row.due_date,
            status=row.status,
            days_until_due=days_until
        ))
        total_amount += row.amount

    return UpcomingOffplanPaymentsResponse(
        payments=payments,
        total_amount=total_amount,
        count=len(payments)
    )


@router.get("/dashboard/summary", response_model=OffplanInvestmentSummary)
def get_investment_summary(db: Session = Depends(get_db)):
    """Get off-plan investment summary statistics."""

    # Total properties count
    total_sql = text("SELECT COUNT(*) FROM offplan_properties")
    total = db.execute(total_sql).scalar() or 0

    # Active properties count
    active_sql = text("SELECT COUNT(*) FROM offplan_properties WHERE status = 'active'")
    active = db.execute(active_sql).scalar() or 0

    # Handed over properties count
    handed_over_sql = text("SELECT COUNT(*) FROM offplan_properties WHERE status = 'handed_over'")
    handed_over = db.execute(handed_over_sql).scalar() or 0

    # Total investment (sum of total_cost)
    investment_sql = text("SELECT COALESCE(SUM(total_cost), 0) FROM offplan_properties")
    investment = db.execute(investment_sql).scalar() or Decimal('0')

    # Total paid
    paid_sql = text("""
        SELECT COALESCE(SUM(paid_amount), 0)
        FROM offplan_payments
        WHERE status = 'paid'
    """)
    paid = db.execute(paid_sql).scalar() or Decimal('0')

    # Total pending
    pending_sql = text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM offplan_payments p
        JOIN offplan_properties o ON p.offplan_property_id = o.id
        WHERE p.status = 'pending'
        AND o.status = 'active'
    """)
    pending = db.execute(pending_sql).scalar() or Decimal('0')

    # Total overdue
    overdue_sql = text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM offplan_payments p
        JOIN offplan_properties o ON p.offplan_property_id = o.id
        WHERE p.status = 'overdue'
        AND o.status = 'active'
    """)
    overdue = db.execute(overdue_sql).scalar() or Decimal('0')

    return OffplanInvestmentSummary(
        total_properties=total,
        active_properties=active,
        handed_over_properties=handed_over,
        total_investment=investment,
        total_paid=paid,
        total_pending=pending,
        total_overdue=overdue
    )
