from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from uuid import UUID, uuid4
from datetime import date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Property, Booking, DTCMPayment
from app.api.auth import get_current_user

router = APIRouter(prefix="/tax", tags=["Tax Reports"])


# ============================================================================
# SCHEMAS
# ============================================================================

class DTCMPaymentCreate(BaseModel):
    payment_date: date
    period_month: int
    period_year: int
    property_id: Optional[UUID] = None  # None = all properties combined
    amount: Decimal
    reference: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class DTCMPaymentResponse(BaseModel):
    id: UUID
    payment_date: date
    period_month: int
    period_year: int
    property_id: Optional[UUID]
    property_name: Optional[str]
    amount: Decimal
    reference: Optional[str]
    payment_method: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class TourismDirhamMonthly(BaseModel):
    month: int
    year: int
    property_id: UUID
    property_name: str
    bedrooms: int
    occupied_nights: int
    rate: Decimal
    collected: Decimal
    paid: Decimal
    outstanding: Decimal
    status: str  # 'paid', 'partial', 'unpaid', 'zero'


class TourismDirhamSummary(BaseModel):
    year: int
    month: Optional[int]
    total_collected: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    properties: List[TourismDirhamMonthly]


# ============================================================================
# TOURISM DIRHAM REPORT
# ============================================================================

@router.get("/tourism-dirham/report")
async def get_tourism_dirham_report(
    year: int,
    month: Optional[int] = None,
    property_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get Tourism Dirham report showing collected vs paid vs outstanding.
    If month is None, returns full year summary.
    """
    results = []

    # Get all active short-term rental properties (only short-term are subject to DTCM)
    properties_query = db.query(Property).filter(
        Property.is_active == True,
        Property.rental_mode == 'short_term'
    )
    if property_id:
        properties_query = properties_query.filter(Property.id == property_id)
    properties = properties_query.all()

    # Determine months to report
    if month:
        months = [month]
    else:
        months = list(range(1, 13))

    for m in months:
        for prop in properties:
            # Calculate collected from bookings in this period
            # Bookings where check_in falls in this month
            bookings = db.query(Booking).filter(
                Booking.property_id == prop.id,
                extract('year', Booking.check_in) == year,
                extract('month', Booking.check_in) == m,
                Booking.status != 'cancelled'
            ).all()

            total_nights = sum((b.check_out - b.check_in).days for b in bookings)

            # Rate based on unit type
            rate = Decimal('15.00') if prop.unit_type == 'deluxe' else Decimal('10.00')
            bedrooms = prop.bedrooms or 1

            collected = Decimal(bedrooms) * Decimal(total_nights) * rate

            # Get payment for this property/period
            payment = db.query(DTCMPayment).filter(
                DTCMPayment.property_id == prop.id,
                DTCMPayment.period_year == year,
                DTCMPayment.period_month == m
            ).first()

            paid = payment.amount if payment else Decimal('0')
            outstanding = collected - paid

            # Determine status
            if total_nights == 0:
                status = 'zero'
            elif outstanding <= 0:
                status = 'paid'
            elif paid > 0:
                status = 'partial'
            else:
                status = 'unpaid'

            results.append(TourismDirhamMonthly(
                month=m,
                year=year,
                property_id=prop.id,
                property_name=prop.name,
                bedrooms=bedrooms,
                occupied_nights=total_nights,
                rate=rate,
                collected=collected,
                paid=paid,
                outstanding=outstanding,
                status=status
            ))

    # Calculate totals
    total_collected = sum(r.collected for r in results)
    total_paid = sum(r.paid for r in results)
    total_outstanding = sum(r.outstanding for r in results)

    return {
        "year": year,
        "month": month,
        "total_collected": total_collected,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "properties": results
    }


# ============================================================================
# DTCM PAYMENTS (REMITTANCES)
# ============================================================================

@router.post("/tourism-dirham/payments", response_model=DTCMPaymentResponse)
async def create_dtcm_payment(
    payment: DTCMPaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Record a DTCM payment (remittance)"""

    # Check if payment already exists for this period/property
    existing = db.query(DTCMPayment).filter(
        DTCMPayment.property_id == payment.property_id,
        DTCMPayment.period_year == payment.period_year,
        DTCMPayment.period_month == payment.period_month
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Payment already recorded for this property/period. Delete existing first."
        )

    db_payment = DTCMPayment(
        id=uuid4(),
        payment_date=payment.payment_date,
        period_month=payment.period_month,
        period_year=payment.period_year,
        property_id=payment.property_id,
        amount=payment.amount,
        reference=payment.reference,
        payment_method=payment.payment_method,
        notes=payment.notes,
        created_by=current_user["id"]
    )

    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    # Add property name for response
    property_name = None
    if db_payment.property_id:
        prop = db.query(Property).filter(Property.id == db_payment.property_id).first()
        property_name = prop.name if prop else None

    return DTCMPaymentResponse(
        id=db_payment.id,
        payment_date=db_payment.payment_date,
        period_month=db_payment.period_month,
        period_year=db_payment.period_year,
        property_id=db_payment.property_id,
        property_name=property_name,
        amount=db_payment.amount,
        reference=db_payment.reference,
        payment_method=db_payment.payment_method,
        notes=db_payment.notes
    )


@router.get("/tourism-dirham/payments", response_model=List[DTCMPaymentResponse])
async def list_dtcm_payments(
    year: Optional[int] = None,
    property_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all DTCM payments"""
    query = db.query(DTCMPayment)

    if year:
        query = query.filter(DTCMPayment.period_year == year)
    if property_id:
        query = query.filter(DTCMPayment.property_id == property_id)

    payments = query.order_by(
        DTCMPayment.period_year.desc(),
        DTCMPayment.period_month.desc()
    ).all()

    # Build response with property names
    results = []
    for p in payments:
        property_name = None
        if p.property_id:
            prop = db.query(Property).filter(Property.id == p.property_id).first()
            property_name = prop.name if prop else None

        results.append(DTCMPaymentResponse(
            id=p.id,
            payment_date=p.payment_date,
            period_month=p.period_month,
            period_year=p.period_year,
            property_id=p.property_id,
            property_name=property_name,
            amount=p.amount,
            reference=p.reference,
            payment_method=p.payment_method,
            notes=p.notes
        ))

    return results


@router.delete("/tourism-dirham/payments/{payment_id}")
async def delete_dtcm_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a DTCM payment"""
    payment = db.query(DTCMPayment).filter(DTCMPayment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(payment)
    db.commit()

    return {"message": "Payment deleted"}
