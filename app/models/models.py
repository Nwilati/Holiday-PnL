from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, ForeignKey, Numeric, Text, CheckConstraint, Computed
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='viewer')
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    property_type = Column(String(100))
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    area = Column(String(100))
    city = Column(String(100), default='Dubai')
    country = Column(String(100), default='UAE')
    bedrooms = Column(Integer, nullable=False, default=1)
    bathrooms = Column(Numeric(3, 1), default=1)
    max_guests = Column(Integer, nullable=False, default=2)
    size_sqft = Column(Integer)
    dtcm_license = Column(String(100))
    dtcm_expiry = Column(Date)
    ejari_number = Column(String(100))
    currency = Column(String(3), default='AED')
    vat_registered = Column(Boolean, default=True)
    vat_rate = Column(Numeric(5, 2), default=5.00)
    timezone = Column(String(50), default='Asia/Dubai')
    fiscal_year_start = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    bookings = relationship("Booking", back_populates="property")
    expenses = relationship("Expense", back_populates="property")


class Channel(Base):
    __tablename__ = "channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    commission_rate = Column(Numeric(5, 2))
    payment_processing_rate = Column(Numeric(5, 2))
    flat_fee_per_booking = Column(Numeric(10, 2), default=0)
    api_enabled = Column(Boolean, default=False)
    ical_url = Column(Text)
    is_active = Column(Boolean, default=True)
    color_hex = Column(String(7), default='#6B7280')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    bookings = relationship("Booking", back_populates="channel")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    parent_code = Column(String(20))
    category_type = Column(String(50))
    cost_type = Column(String(20), default='variable')
    is_vat_applicable = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    expenses = relationship("Expense", back_populates="category")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)
    channel_id = Column(UUID(as_uuid=True), ForeignKey('channels.id'), nullable=False)
    booking_ref = Column(String(100))
    confirmation_code = Column(String(50))
    guest_name = Column(String(255))
    guest_email = Column(String(255))
    guest_phone = Column(String(50))
    guest_count = Column(Integer, default=1)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    nights = Column(Integer, Computed('check_out - check_in'))
    booked_at = Column(DateTime(timezone=True))
    status = Column(String(20), default='confirmed')
    nightly_rate = Column(Numeric(10, 2), nullable=False)
    subtotal_accommodation = Column(Numeric(10, 2))
    cleaning_fee = Column(Numeric(10, 2), default=0)
    extra_guest_fee = Column(Numeric(10, 2), default=0)
    other_fees = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    discount_reason = Column(String(255))
    gross_revenue = Column(Numeric(10, 2), Computed('COALESCE(subtotal_accommodation, 0) + COALESCE(cleaning_fee, 0) + COALESCE(extra_guest_fee, 0) + COALESCE(other_fees, 0) - COALESCE(discount_amount, 0)'))
    tourism_fee = Column(Numeric(10, 2), default=0)
    municipality_fee = Column(Numeric(10, 2), default=0)
    vat_collected = Column(Numeric(10, 2), default=0)
    platform_commission = Column(Numeric(10, 2), default=0)
    platform_commission_rate = Column(Numeric(5, 2))
    payment_processing_fee = Column(Numeric(10, 2), default=0)
    net_revenue = Column(Numeric(10, 2), Computed('COALESCE(subtotal_accommodation, 0) + COALESCE(cleaning_fee, 0) + COALESCE(extra_guest_fee, 0) + COALESCE(other_fees, 0) - COALESCE(discount_amount, 0) - COALESCE(platform_commission, 0) - COALESCE(payment_processing_fee, 0)'))
    payout_date = Column(Date)
    payout_amount = Column(Numeric(10, 2))
    payout_reference = Column(String(100))
    payout_method = Column(String(20))
    is_paid = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True))
    cancellation_reason = Column(Text)
    refund_amount = Column(Numeric(10, 2), default=0)
    cancellation_fee_retained = Column(Numeric(10, 2), default=0)
    notes = Column(Text)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    property = relationship("Property", back_populates="bookings")
    channel = relationship("Channel", back_populates="bookings")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('expense_categories.id'), nullable=False)
    expense_date = Column(Date, nullable=False)
    vendor = Column(String(255))
    description = Column(Text)
    amount = Column(Numeric(10, 2), nullable=False)
    vat_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), Computed('amount + COALESCE(vat_amount, 0)'))
    cost_type = Column(String(20), default='variable')
    is_booking_linked = Column(Boolean, default=False)
    linked_booking_id = Column(UUID(as_uuid=True), ForeignKey('bookings.id'))
    payment_method = Column(String(20))
    payment_date = Column(Date)
    payment_reference = Column(String(100))
    is_paid = Column(Boolean, default=True)
    receipt_url = Column(Text)
    receipt_filename = Column(String(255))
    notes = Column(Text)
    is_reconciled = Column(Boolean, default=False)
    reconciled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    property = relationship("Property", back_populates="expenses")
    category = relationship("ExpenseCategory", back_populates="expenses")


class CalendarBlock(Base):
    __tablename__ = "calendar_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    nights = Column(Integer, Computed('end_date - start_date'))
    reason = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    file_type = Column(String(50))
    file_size = Column(Integer)
    storage_path = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name = Column(String(100), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(20), nullable=False)
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    changed_fields = Column(ARRAY(Text))
    changed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(INET)
    user_agent = Column(Text)
