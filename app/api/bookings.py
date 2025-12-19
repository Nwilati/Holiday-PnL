from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date
from app.core.database import get_db
from app.models.models import Booking, Property, Channel
from app.schemas.schemas import BookingCreate, BookingUpdate, BookingResponse
from app.api.accounting import generate_booking_journal

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.get("", response_model=List[BookingResponse])
def get_bookings(
    property_id: Optional[UUID] = None,
    channel_id: Optional[UUID] = None,
    booking_status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    is_paid: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Booking)

    if property_id:
        query = query.filter(Booking.property_id == property_id)
    if channel_id:
        query = query.filter(Booking.channel_id == channel_id)
    if booking_status:
        query = query.filter(text(f"status::text = '{booking_status}'"))
    if start_date:
        query = query.filter(Booking.check_in >= start_date)
    if end_date:
        query = query.filter(Booking.check_in <= end_date)
    if is_paid is not None:
        query = query.filter(Booking.is_paid == is_paid)

    bookings = query.order_by(Booking.check_in.desc()).offset(skip).limit(limit).all()
    return bookings

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
    # Validate property exists
    property = db.query(Property).filter(Property.id == booking_data.property_id).first()
    if not property:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Validate channel exists
    channel = db.query(Channel).filter(Channel.id == booking_data.channel_id).first()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    # Validate dates
    if booking_data.check_out <= booking_data.check_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Check-out must be after check-in")

    booking_dict = booking_data.model_dump()

    # Calculate subtotal if not provided
    if not booking_dict.get('subtotal_accommodation'):
        nights = (booking_data.check_out - booking_data.check_in).days
        booking_dict['subtotal_accommodation'] = float(booking_data.nightly_rate * nights)

    booking_id = uuid4()
    status_val = booking_dict.get('status', 'confirmed')
    payout_method_val = booking_dict.get('payout_method') or None

    # Use raw SQL with CAST() instead of :: syntax
    sql = text("""
        INSERT INTO bookings (
            id, property_id, channel_id, booking_ref, confirmation_code,
            guest_name, guest_email, guest_phone, guest_count,
            check_in, check_out, booked_at, status,
            nightly_rate, subtotal_accommodation, cleaning_fee, extra_guest_fee,
            other_fees, discount_amount, discount_reason,
            tourism_fee, municipality_fee, vat_collected,
            platform_commission, platform_commission_rate, payment_processing_fee,
            payout_date, payout_amount, payout_reference, payout_method,
            is_paid, cancelled_at, cancellation_reason,
            refund_amount, cancellation_fee_retained, notes, is_locked
        ) VALUES (
            :id, :property_id, :channel_id, :booking_ref, :confirmation_code,
            :guest_name, :guest_email, :guest_phone, :guest_count,
            :check_in, :check_out, :booked_at, CAST(:status AS booking_status),
            :nightly_rate, :subtotal_accommodation, :cleaning_fee, :extra_guest_fee,
            :other_fees, :discount_amount, :discount_reason,
            :tourism_fee, :municipality_fee, :vat_collected,
            :platform_commission, :platform_commission_rate, :payment_processing_fee,
            :payout_date, :payout_amount, :payout_reference, CAST(:payout_method AS payment_method),
            :is_paid, :cancelled_at, :cancellation_reason,
            :refund_amount, :cancellation_fee_retained, :notes, :is_locked
        )
    """)

    db.execute(sql, {
        'id': booking_id,
        'property_id': booking_dict.get('property_id'),
        'channel_id': booking_dict.get('channel_id'),
        'booking_ref': booking_dict.get('booking_ref'),
        'confirmation_code': booking_dict.get('confirmation_code'),
        'guest_name': booking_dict.get('guest_name'),
        'guest_email': booking_dict.get('guest_email') or None,
        'guest_phone': booking_dict.get('guest_phone'),
        'guest_count': booking_dict.get('guest_count', 1),
        'check_in': booking_dict.get('check_in'),
        'check_out': booking_dict.get('check_out'),
        'booked_at': booking_dict.get('booked_at'),
        'status': status_val,
        'nightly_rate': booking_dict.get('nightly_rate'),
        'subtotal_accommodation': booking_dict.get('subtotal_accommodation'),
        'cleaning_fee': booking_dict.get('cleaning_fee', 0),
        'extra_guest_fee': booking_dict.get('extra_guest_fee', 0),
        'other_fees': booking_dict.get('other_fees', 0),
        'discount_amount': booking_dict.get('discount_amount', 0),
        'discount_reason': booking_dict.get('discount_reason'),
        'tourism_fee': booking_dict.get('tourism_fee', 0),
        'municipality_fee': booking_dict.get('municipality_fee', 0),
        'vat_collected': booking_dict.get('vat_collected', 0),
        'platform_commission': booking_dict.get('platform_commission', 0),
        'platform_commission_rate': booking_dict.get('platform_commission_rate'),
        'payment_processing_fee': booking_dict.get('payment_processing_fee', 0),
        'payout_date': booking_dict.get('payout_date'),
        'payout_amount': booking_dict.get('payout_amount'),
        'payout_reference': booking_dict.get('payout_reference'),
        'payout_method': payout_method_val,
        'is_paid': booking_dict.get('is_paid', False),
        'cancelled_at': booking_dict.get('cancelled_at'),
        'cancellation_reason': booking_dict.get('cancellation_reason'),
        'refund_amount': booking_dict.get('refund_amount', 0),
        'cancellation_fee_retained': booking_dict.get('cancellation_fee_retained', 0),
        'notes': booking_dict.get('notes'),
        'is_locked': booking_dict.get('is_locked', False),
    })

    db.commit()

    # Fetch the created booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    # Auto-generate journal entry
    try:
        generate_booking_journal(booking_id=booking.id, db=db)
    except Exception as e:
        print(f"Warning: Could not auto-generate journal for booking: {e}")

    return booking

@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking

@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(booking_id: UUID, booking_data: BookingUpdate, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Booking is locked")

    update_data = booking_data.model_dump(exclude_unset=True)

    # Track if key financial fields changed (for journal regeneration)
    financial_fields = {'nightly_rate', 'subtotal_accommodation', 'cleaning_fee', 'extra_guest_fee',
                        'other_fees', 'discount_amount', 'platform_commission', 'check_in', 'check_out'}
    financial_changed = any(field in update_data for field in financial_fields)

    # Build dynamic update SQL
    set_clauses = []
    params = {'id': booking_id}

    for field, value in update_data.items():
        if field == 'status':
            set_clauses.append(f"status = CAST(:{field} AS booking_status)")
        elif field == 'payout_method':
            set_clauses.append(f"payout_method = CAST(:{field} AS payment_method)")
        else:
            set_clauses.append(f"{field} = :{field}")
        params[field] = value if value != '' else None

    if set_clauses:
        sql = text(f"UPDATE bookings SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id")
        db.execute(sql, params)
        db.commit()

    db.refresh(booking)

    # Regenerate journal entry if financial fields changed
    if financial_changed:
        try:
            # Delete existing unposted journal first
            db.execute(text('''
                DELETE FROM journal_entries
                WHERE source = :source AND source_id = :source_id AND is_posted = FALSE
            '''), {'source': 'booking', 'source_id': booking_id})
            db.commit()
            generate_booking_journal(booking_id=booking.id, db=db)
        except Exception as e:
            print(f"Warning: Could not regenerate journal for booking: {e}")

    return booking

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Booking is locked")
    db.delete(booking)
    db.commit()
    return None

@router.post("/{booking_id}/lock", response_model=BookingResponse)
def lock_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    booking.is_locked = True
    db.commit()
    db.refresh(booking)
    return booking
