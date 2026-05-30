from typing import Optional, Any
from datetime import date, datetime
from decimal import Decimal
import uuid

from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, Numeric, Text, Computed
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET, ARRAY, ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default='viewer')
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    property_type: Mapped[Optional[str]] = mapped_column(String(100))
    address_line1: Mapped[Optional[str]] = mapped_column(String(255))
    address_line2: Mapped[Optional[str]] = mapped_column(String(255))
    area: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100), default='Dubai')
    country: Mapped[Optional[str]] = mapped_column(String(100), default='UAE')
    bedrooms: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    bathrooms: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1), default=1)
    max_guests: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    size_sqft: Mapped[Optional[int]] = mapped_column(Integer)
    unit_type: Mapped[Optional[str]] = mapped_column(String(20), default='standard')
    rental_mode: Mapped[Optional[str]] = mapped_column(String(20), default='short_term')  # 'short_term' or 'annual'
    dtcm_license: Mapped[Optional[str]] = mapped_column(String(100))
    dtcm_expiry: Mapped[Optional[date]] = mapped_column(Date)
    ejari_number: Mapped[Optional[str]] = mapped_column(String(100))
    currency: Mapped[Optional[str]] = mapped_column(String(3), default='AED')
    vat_registered: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    vat_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), default=5.00)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), default='Asia/Dubai')
    fiscal_year_start: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    purchase_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="property")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="property")
    tenancies: Mapped[list["Tenancy"]] = relationship("Tenancy", back_populates="property")


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    commission_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    payment_processing_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    flat_fee_per_booking: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    api_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    ical_url: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String(7), default='#6B7280')
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="channel")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_code: Mapped[Optional[str]] = mapped_column(String(20))
    category_type: Mapped[Optional[str]] = mapped_column(String(50))
    cost_type: Mapped[Optional[str]] = mapped_column(String(20), default='variable')
    is_vat_applicable: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    display_order: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="category")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)
    channel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('channels.id'), nullable=False)
    booking_ref: Mapped[Optional[str]] = mapped_column(String(100))
    confirmation_code: Mapped[Optional[str]] = mapped_column(String(50))
    guest_name: Mapped[Optional[str]] = mapped_column(String(255))
    guest_email: Mapped[Optional[str]] = mapped_column(String(255))
    guest_phone: Mapped[Optional[str]] = mapped_column(String(50))
    guest_count: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    nights: Mapped[Optional[int]] = mapped_column(Integer, Computed('check_out - check_in'))
    booked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[Optional[str]] = mapped_column(PgEnum('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', name='booking_status', create_type=False), default='confirmed')
    nightly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal_accommodation: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    cleaning_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    extra_guest_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    other_fees: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    discount_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    discount_reason: Mapped[Optional[str]] = mapped_column(String(255))
    gross_revenue: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), Computed('COALESCE(subtotal_accommodation, 0) + COALESCE(cleaning_fee, 0) + COALESCE(extra_guest_fee, 0) + COALESCE(other_fees, 0) - COALESCE(discount_amount, 0)'))
    tourism_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    municipality_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    vat_collected: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    platform_commission: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    platform_commission_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    payment_processing_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    net_revenue: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), Computed('COALESCE(subtotal_accommodation, 0) + COALESCE(cleaning_fee, 0) + COALESCE(extra_guest_fee, 0) + COALESCE(other_fees, 0) - COALESCE(discount_amount, 0) - COALESCE(platform_commission, 0) - COALESCE(payment_processing_fee, 0)'))
    payout_date: Mapped[Optional[date]] = mapped_column(Date)
    payout_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    payout_reference: Mapped[Optional[str]] = mapped_column(String(100))
    payout_method: Mapped[Optional[str]] = mapped_column(String(20))
    is_paid: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text)
    refund_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    cancellation_fee_retained: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_locked: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    property: Mapped["Property"] = relationship("Property", back_populates="bookings")
    channel: Mapped["Channel"] = relationship("Channel", back_populates="bookings")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('expense_categories.id'), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    vat_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    total_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), Computed('amount + COALESCE(vat_amount, 0)'))
    cost_type: Mapped[Optional[str]] = mapped_column(String(20), default='variable')
    is_booking_linked: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    linked_booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('bookings.id'))
    payment_method: Mapped[Optional[str]] = mapped_column(String(20))
    payment_date: Mapped[Optional[date]] = mapped_column(Date)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100))
    is_paid: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(Text)
    receipt_filename: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_reconciled: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    reconciled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    property: Mapped["Property"] = relationship("Property", back_populates="expenses")
    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory", back_populates="expenses")


class CalendarBlock(Base):
    __tablename__ = "calendar_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    nights: Mapped[Optional[int]] = mapped_column(Integer, Computed('end_date - start_date'))
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255))
    file_type: Mapped[Optional[str]] = mapped_column(String(50))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    old_values: Mapped[Optional[Any]] = mapped_column(JSONB)
    new_values: Mapped[Optional[Any]] = mapped_column(JSONB)
    changed_fields: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))
    changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)


# ============================================================================
# ANNUAL TENANCY MODELS
# ============================================================================

class Tenancy(Base):
    __tablename__ = "tenancies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('properties.id'), nullable=False)

    # Tenant Information
    tenant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    tenant_email: Mapped[str] = mapped_column(String(255), nullable=False)
    tenant_phone: Mapped[str] = mapped_column(String(50), nullable=False)

    # Contract Details
    contract_start: Mapped[date] = mapped_column(Date, nullable=False)
    contract_end: Mapped[date] = mapped_column(Date, nullable=False)
    annual_rent: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    contract_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    security_deposit: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), default=0)
    num_cheques: Mapped[int] = mapped_column(Integer, nullable=False)
    ejari_number: Mapped[Optional[str]] = mapped_column(String(100))

    # Status and Lifecycle
    status: Mapped[Optional[str]] = mapped_column(PgEnum('active', 'expired', 'terminated', 'renewed', name='tenancy_status', create_type=False), default='active')
    previous_tenancy_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('tenancies.id'))
    termination_date: Mapped[Optional[date]] = mapped_column(Date)
    termination_reason: Mapped[Optional[str]] = mapped_column(Text)

    # Early Termination Settlement
    charge_penalty: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    penalty_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), default=0)
    refund_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), default=0)        # Paid back to tenant (>= 0)
    balance_due_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), default=0)   # Still owed by tenant (>= 0)

    # Additional
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Deposit tracking
    deposit_status: Mapped[Optional[str]] = mapped_column(String(20), default='pending')  # pending, received, partially_refunded, refunded, forfeited

    # Relationships
    property: Mapped["Property"] = relationship("Property", back_populates="tenancies")
    cheques: Mapped[list["TenancyCheque"]] = relationship("TenancyCheque", back_populates="tenancy", cascade="all, delete-orphan")
    documents: Mapped[list["TenancyDocument"]] = relationship("TenancyDocument", back_populates="tenancy", cascade="all, delete-orphan")
    deposit_transactions: Mapped[list["DepositTransaction"]] = relationship("DepositTransaction", back_populates="tenancy", cascade="all, delete-orphan")
    previous_tenancy: Mapped[Optional["Tenancy"]] = relationship("Tenancy", remote_side=[id], backref="renewed_tenancy")


class TenancyCheque(Base):
    __tablename__ = "tenancy_cheques"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenancies.id'), nullable=False)

    # Payment Method
    payment_method: Mapped[Optional[str]] = mapped_column(String(20), default='cheque')  # 'cheque', 'bank_transfer', 'cash'

    # Cheque Details (nullable for non-cheque payments)
    cheque_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # For bank transfers

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Status Tracking
    status: Mapped[Optional[str]] = mapped_column(PgEnum('pending', 'deposited', 'cleared', 'bounced', 'cancelled', 'replaced', name='cheque_status', create_type=False), default='pending')
    deposited_date: Mapped[Optional[date]] = mapped_column(Date)
    cleared_date: Mapped[Optional[date]] = mapped_column(Date)
    bounce_reason: Mapped[Optional[str]] = mapped_column(Text)

    # Additional
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenancy: Mapped["Tenancy"] = relationship("Tenancy", back_populates="cheques")


class TenancyDocument(Base):
    __tablename__ = "tenancy_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenancies.id'), nullable=False)

    # Document Details
    document_type: Mapped[str] = mapped_column(PgEnum('contract', 'emirates_id', 'passport', 'trade_license', 'other', name='document_type', create_type=False), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_data: Mapped[str] = mapped_column(Text, nullable=False)  # Base64 encoded
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))

    # Timestamps
    uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    tenancy: Mapped["Tenancy"] = relationship("Tenancy", back_populates="documents")


# ============================================================================
# ACCOUNTING MODELS
# ============================================================================

class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(20), nullable=False)  # asset/liability/equity/revenue/expense
    parent_code: Mapped[Optional[str]] = mapped_column(String(20))

    is_system: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    allow_manual_entries: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    default_vat_treatment: Mapped[Optional[str]] = mapped_column(String(20), default='out_of_scope')

    description: Mapped[Optional[str]] = mapped_column(Text)
    display_order: Mapped[Optional[int]] = mapped_column(Integer, default=0)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    journal_lines: Mapped[list["JournalLine"]] = relationship("JournalLine", back_populates="account")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)

    source: Mapped[str] = mapped_column(String(20), nullable=False)  # booking/expense/tenancy/adjustment/manual
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    description: Mapped[str] = mapped_column(Text, nullable=False)
    memo: Mapped[Optional[str]] = mapped_column(Text)

    is_posted: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_locked: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_reversed: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    reversed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('journal_entries.id'))

    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    posted_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    lines: Mapped[list["JournalLine"]] = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")
    reversed_by: Mapped[Optional["JournalEntry"]] = relationship("JournalEntry", remote_side=[id], backref="reversal_of")


class JournalLine(Base):
    __tablename__ = "journal_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journal_entry_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('journal_entries.id', ondelete='CASCADE'), nullable=False)

    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('accounts.id'), nullable=False)

    debit: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), default=0)
    credit: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), default=0)

    property_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('properties.id'))
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('bookings.id'))
    expense_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('expenses.id'))
    tenancy_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('tenancies.id'))

    vat_treatment: Mapped[Optional[str]] = mapped_column(String(20), default='out_of_scope')
    vat_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)

    description: Mapped[Optional[str]] = mapped_column(Text)
    line_order: Mapped[Optional[int]] = mapped_column(Integer, default=0)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship("JournalEntry", back_populates="lines")
    account: Mapped["Account"] = relationship("Account", back_populates="journal_lines")
    property: Mapped[Optional["Property"]] = relationship("Property")
    booking: Mapped[Optional["Booking"]] = relationship("Booking")
    expense: Mapped[Optional["Expense"]] = relationship("Expense")
    tenancy: Mapped[Optional["Tenancy"]] = relationship("Tenancy")


# ============================================================================
# DTCM PAYMENT MODEL
# ============================================================================

class DTCMPayment(Base):
    __tablename__ = "dtcm_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    property_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(100))
    payment_method: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    property: Mapped[Optional["Property"]] = relationship("Property")


# ============================================================================
# DEPOSIT TRANSACTION MODEL
# ============================================================================

class DepositTransaction(Base):
    __tablename__ = "deposit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenancy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenancies.id", ondelete="CASCADE"), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # received, deduction, refund
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    deduction_reason: Mapped[Optional[str]] = mapped_column(String(50))  # damages, cleaning, unpaid_rent, other
    journal_entry_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    tenancy: Mapped["Tenancy"] = relationship("Tenancy", back_populates="deposit_transactions")
    journal_entry: Mapped[Optional["JournalEntry"]] = relationship("JournalEntry")


# ============================================================================
# OFF-PLAN PROPERTY MODELS
# ============================================================================

class OffplanProperty(Base):
    __tablename__ = "offplan_properties"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Developer and Project Info
    developer: Mapped[str] = mapped_column(String(255), nullable=False)
    project_name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_number: Mapped[str] = mapped_column(String(100), nullable=False)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100))

    # Unit Details
    unit_type: Mapped[Optional[str]] = mapped_column(String(100))  # apartment, villa, townhouse, etc.
    unit_model: Mapped[Optional[str]] = mapped_column(String(100))
    internal_area_sqm: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    balcony_area_sqm: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    total_area_sqm: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    floor_number: Mapped[Optional[int]] = mapped_column(Integer)
    building_number: Mapped[Optional[str]] = mapped_column(String(50))
    bedrooms: Mapped[Optional[int]] = mapped_column(Integer)
    bathrooms: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1))
    parking_spots: Mapped[Optional[int]] = mapped_column(Integer)

    # Location
    emirate: Mapped[str] = mapped_column(PgEnum(
        'abu_dhabi', 'dubai', 'sharjah', 'ajman',
        'ras_al_khaimah', 'fujairah', 'umm_al_quwain',
        name='emirate_type', create_type=False
    ), nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(255))
    community: Mapped[Optional[str]] = mapped_column(String(255))

    # Financial Details
    base_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    land_dept_fee_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), default=4.00)
    land_dept_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    admin_fees: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    other_fees: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), default=0)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    # Dates
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_handover: Mapped[Optional[date]] = mapped_column(Date)
    actual_handover: Mapped[Optional[date]] = mapped_column(Date)

    # Status
    status: Mapped[Optional[str]] = mapped_column(PgEnum('active', 'handed_over', 'cancelled', name='offplan_status', create_type=False), default='active')

    # Conversion to rental property
    converted_property_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('properties.id'))

    # Promotions
    promotion_name: Mapped[Optional[str]] = mapped_column(String(255))
    amc_waiver_years: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    dlp_waiver_years: Mapped[Optional[int]] = mapped_column(Integer, default=0)

    # Additional
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    payments: Mapped[list["OffplanPayment"]] = relationship("OffplanPayment", back_populates="property", cascade="all, delete-orphan")
    documents: Mapped[list["OffplanDocument"]] = relationship("OffplanDocument", back_populates="property", cascade="all, delete-orphan")
    converted_property: Mapped[Optional["Property"]] = relationship("Property")


class OffplanPayment(Base):
    __tablename__ = "offplan_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offplan_property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('offplan_properties.id', ondelete='CASCADE'), nullable=False)

    # Payment Schedule Details
    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)
    milestone_name: Mapped[str] = mapped_column(String(255), nullable=False)
    percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Payment Status
    status: Mapped[Optional[str]] = mapped_column(PgEnum('pending', 'paid', 'overdue', name='offplan_payment_status', create_type=False), default='pending')

    # Payment Details
    paid_date: Mapped[Optional[date]] = mapped_column(Date)
    paid_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    payment_method: Mapped[Optional[str]] = mapped_column(String(50))
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100))
    receipt_url: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    property: Mapped["OffplanProperty"] = relationship("OffplanProperty", back_populates="payments")


class OffplanDocument(Base):
    __tablename__ = "offplan_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offplan_property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('offplan_properties.id', ondelete='CASCADE'), nullable=False)

    # Document Details
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_data: Mapped[str] = mapped_column(Text, nullable=False)  # Base64 encoded
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))

    # Timestamps
    uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'))

    # Relationships
    property: Mapped["OffplanProperty"] = relationship("OffplanProperty", back_populates="documents")
