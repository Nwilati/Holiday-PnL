from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.core.database import get_db
from app.models.models import Booking, Property, Channel
from app.schemas.schemas import BookingCreate, BookingUpdate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.get("", response_model=List[BookingResponse])
def get_bookings(
    property_id: Optional[UUID] = None,
    channel_id: Optional[UUID] = None,
    status: Optional[str] = None,
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
    if status:
        query = query.filter(text(f"status::text = '{status}'"))
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )

    # Validate channel exists
    channel = db.query(Channel).filter(Channel.id == booking_data.channel_id).first()
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )

    # Validate dates
    if booking_data.check_out <= booking_data.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out must be after check-in"
        )

    # Calculate subtotal if not provided
    booking_dict = booking_data.model_dump()
    if not booking_dict.get('subtotal_accommodation'):
        nights = (booking_data.check_out - booking_data.check_in).days
        booking_dict['subtotal_accommodation'] = booking_data.nightly_rate * nights

    # Get status value and remove from dict
    status_value = booking_dict.pop('status', 'confirmed')

    # Create booking without status first
    booking = Booking(**booking_dict)
    db.add(booking)
    db.flush()

    # Update status using raw SQL to handle enum
    db.execute(
        text(f"UPDATE bookings SET status = :status WHERE id = :id"),
        {"status": status_value, "id": str(booking.id)}
    )

    db.commit()
    db.refresh(booking)
    return booking

@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    return booking

@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: UUID,
    booking_data: BookingUpdate,
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Booking is locked and cannot be edited"
        )

    update_data = booking_data.model_dump(exclude_unset=True)

    # Handle status separately
    status_value = update_data.pop('status', None)

    for field, value in update_data.items():
        setattr(booking, field, value)

    if status_value:
        db.execute(
            text(f"UPDATE bookings SET status = :status WHERE id = :id"),
            {"status": status_value, "id": str(booking_id)}
        )

    db.commit()
    db.refresh(booking)
    return booking

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Booking is locked and cannot be deleted"
        )

    db.delete(booking)
    db.commit()
    return None

@router.post("/{booking_id}/lock", response_model=BookingResponse)
def lock_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    booking.is_locked = True
    db.commit()
    db.refresh(booking)
    return booking
