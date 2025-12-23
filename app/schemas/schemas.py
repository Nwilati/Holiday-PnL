from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "viewer"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None


# ============================================================================
# PROPERTY SCHEMAS
# ============================================================================

class PropertyBase(BaseModel):
    name: str
    property_type: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    area: Optional[str] = None
    city: str = "Dubai"
    country: str = "UAE"
    bedrooms: int = 1
    bathrooms: Optional[Decimal] = 1
    max_guests: int = 2
    size_sqft: Optional[int] = None
    unit_type: Optional[str] = "standard"  # 'standard' or 'deluxe'
    rental_mode: Optional[str] = "short_term"  # 'short_term' or 'annual'
    dtcm_license: Optional[str] = None
    dtcm_expiry: Optional[date] = None
    ejari_number: Optional[str] = None
    currency: str = "AED"
    vat_registered: bool = True
    vat_rate: Decimal = Decimal("5.00")
    timezone: str = "Asia/Dubai"
    purchase_price: Optional[Decimal] = None
    purchase_date: Optional[date] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[Decimal] = None
    max_guests: Optional[int] = None
    size_sqft: Optional[int] = None
    unit_type: Optional[str] = None
    rental_mode: Optional[str] = None
    dtcm_license: Optional[str] = None
    dtcm_expiry: Optional[date] = None
    ejari_number: Optional[str] = None
    is_active: Optional[bool] = None
    purchase_price: Optional[Decimal] = None
    purchase_date: Optional[date] = None

class PropertyResponse(PropertyBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    purchase_price: Optional[Decimal] = None
    purchase_date: Optional[date] = None

    class Config:
        from_attributes = True


# ============================================================================
# CHANNEL SCHEMAS
# ============================================================================

class ChannelBase(BaseModel):
    code: str
    name: str
    commission_rate: Optional[Decimal] = None
    payment_processing_rate: Optional[Decimal] = None
    flat_fee_per_booking: Decimal = Decimal("0")
    color_hex: str = "#6B7280"

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    commission_rate: Optional[Decimal] = None
    payment_processing_rate: Optional[Decimal] = None
    flat_fee_per_booking: Optional[Decimal] = None
    is_active: Optional[bool] = None
    color_hex: Optional[str] = None

class ChannelResponse(ChannelBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# EXPENSE CATEGORY SCHEMAS
# ============================================================================

class ExpenseCategoryBase(BaseModel):
    code: str
    name: str
    parent_code: Optional[str] = None
    category_type: Optional[str] = None
    cost_type: str = "variable"
    is_vat_applicable: bool = True
    display_order: int = 0

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: UUID
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================================
# BOOKING SCHEMAS
# ============================================================================

class BookingBase(BaseModel):
    property_id: UUID
    channel_id: UUID
    booking_ref: Optional[str] = None
    confirmation_code: Optional[str] = None
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_count: int = 1
    check_in: date
    check_out: date
    status: str = "confirmed"
    nightly_rate: Decimal
    subtotal_accommodation: Optional[Decimal] = None
    cleaning_fee: Decimal = Decimal("0")
    extra_guest_fee: Decimal = Decimal("0")
    other_fees: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    discount_reason: Optional[str] = None
    tourism_fee: Decimal = Decimal("0")
    municipality_fee: Decimal = Decimal("0")
    vat_collected: Decimal = Decimal("0")
    platform_commission: Decimal = Decimal("0")
    platform_commission_rate: Optional[Decimal] = None
    payment_processing_fee: Decimal = Decimal("0")
    payout_date: Optional[date] = None
    payout_amount: Optional[Decimal] = None
    payout_reference: Optional[str] = None
    payout_method: Optional[str] = None
    is_paid: bool = False
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    channel_id: Optional[UUID] = None
    booking_ref: Optional[str] = None
    confirmation_code: Optional[str] = None
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_count: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    status: Optional[str] = None
    nightly_rate: Optional[Decimal] = None
    subtotal_accommodation: Optional[Decimal] = None
    cleaning_fee: Optional[Decimal] = None
    extra_guest_fee: Optional[Decimal] = None
    other_fees: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    discount_reason: Optional[str] = None
    tourism_fee: Optional[Decimal] = None
    municipality_fee: Optional[Decimal] = None
    vat_collected: Optional[Decimal] = None
    platform_commission: Optional[Decimal] = None
    platform_commission_rate: Optional[Decimal] = None
    payment_processing_fee: Optional[Decimal] = None
    payout_date: Optional[date] = None
    payout_amount: Optional[Decimal] = None
    payout_reference: Optional[str] = None
    payout_method: Optional[str] = None
    is_paid: Optional[bool] = None
    notes: Optional[str] = None

class BookingResponse(BookingBase):
    id: UUID
    nights: Optional[int] = None
    gross_revenue: Optional[Decimal] = None
    net_revenue: Optional[Decimal] = None
    is_locked: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# EXPENSE SCHEMAS
# ============================================================================

class ExpenseBase(BaseModel):
    property_id: UUID
    category_id: UUID
    expense_date: date
    vendor: Optional[str] = None
    description: Optional[str] = None
    amount: Decimal
    vat_amount: Decimal = Decimal("0")
    cost_type: str = "variable"
    is_booking_linked: bool = False
    linked_booking_id: Optional[UUID] = None
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    is_paid: bool = True
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category_id: Optional[UUID] = None
    expense_date: Optional[date] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    cost_type: Optional[str] = None
    is_booking_linked: Optional[bool] = None
    linked_booking_id: Optional[UUID] = None
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    is_paid: Optional[bool] = None
    notes: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: UUID
    total_amount: Optional[Decimal] = None
    is_reconciled: bool
    receipt_filename: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# CALENDAR BLOCK SCHEMAS
# ============================================================================

class CalendarBlockBase(BaseModel):
    property_id: UUID
    start_date: date
    end_date: date
    reason: str
    description: Optional[str] = None

class CalendarBlockCreate(CalendarBlockBase):
    pass

class CalendarBlockUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None
    description: Optional[str] = None

class CalendarBlockResponse(CalendarBlockBase):
    id: UUID
    nights: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# DASHBOARD SCHEMAS
# ============================================================================

class DashboardKPIs(BaseModel):
    total_revenue: Decimal
    net_revenue: Decimal
    total_expenses: Decimal
    noi: Decimal
    occupancy_rate: Decimal
    adr: Decimal
    revpar: Decimal
    total_bookings: int
    total_nights: int
    expense_ratio: Decimal

class MonthlyRevenue(BaseModel):
    month: str
    gross_revenue: Decimal
    net_revenue: Decimal
    expenses: Decimal
    noi: Decimal

class ChannelPerformance(BaseModel):
    channel_name: str
    channel_color: str
    bookings: int
    nights: int
    revenue: Decimal
    percentage: Decimal

class ExpenseBreakdown(BaseModel):
    category_name: str
    amount: Decimal
    percentage: Decimal


# ============================================================================
# TENANCY CHEQUE SCHEMAS
# ============================================================================

class TenancyChequeBase(BaseModel):
    payment_method: Literal['cheque', 'bank_transfer', 'cash'] = 'cheque'
    amount: Decimal
    due_date: date
    cheque_number: Optional[str] = None  # Required only for cheques
    bank_name: Optional[str] = None  # Required only for cheques
    reference_number: Optional[str] = None  # For bank transfers
    status: Literal['pending', 'deposited', 'cleared', 'bounced'] = 'pending'
    deposited_date: Optional[date] = None
    cleared_date: Optional[date] = None
    bounce_reason: Optional[str] = None
    notes: Optional[str] = None

class TenancyChequeCreate(TenancyChequeBase):
    pass

class TenancyChequeUpdate(BaseModel):
    payment_method: Optional[Literal['cheque', 'bank_transfer', 'cash']] = None
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    reference_number: Optional[str] = None
    amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    status: Optional[Literal['pending', 'deposited', 'cleared', 'bounced']] = None
    deposited_date: Optional[date] = None
    cleared_date: Optional[date] = None
    bounce_reason: Optional[str] = None
    notes: Optional[str] = None

class TenancyChequeResponse(BaseModel):
    id: UUID
    tenancy_id: UUID
    payment_method: Optional[str] = 'cheque'
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    reference_number: Optional[str] = None
    amount: Decimal
    due_date: date
    status: str
    deposited_date: Optional[date] = None
    cleared_date: Optional[date] = None
    bounce_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# TENANCY DOCUMENT SCHEMAS
# ============================================================================

class TenancyDocumentBase(BaseModel):
    document_type: Literal['contract', 'emirates_id', 'passport', 'trade_license', 'other']
    filename: str

class TenancyDocumentCreate(TenancyDocumentBase):
    file_data: str  # Base64 encoded
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

class TenancyDocumentResponse(TenancyDocumentBase):
    id: UUID
    tenancy_id: UUID
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class TenancyDocumentWithData(TenancyDocumentResponse):
    file_data: str  # Include base64 data for download


# ============================================================================
# TENANCY SCHEMAS
# ============================================================================

class TenancyBase(BaseModel):
    property_id: UUID
    tenant_name: str
    tenant_email: EmailStr
    tenant_phone: str
    contract_start: date
    contract_end: date
    annual_rent: Decimal
    contract_value: Decimal
    security_deposit: Decimal = Decimal("0")
    num_cheques: Literal[0, 1, 2, 3, 4, 6, 12] = 1  # 0 = manual payments
    ejari_number: Optional[str] = None
    notes: Optional[str] = None

class TenancyChequeInput(BaseModel):
    payment_method: Literal['cheque', 'bank_transfer', 'cash'] = 'cheque'
    amount: Decimal
    due_date: date
    cheque_number: Optional[str] = None  # Required only for cheques
    bank_name: Optional[str] = None  # Required only for cheques
    reference_number: Optional[str] = None  # For bank transfers

class TenancyCreate(TenancyBase):
    cheques: Optional[List[TenancyChequeInput]] = None  # Manual cheque entry (optional)
    auto_split_cheques: bool = True  # Auto-split if cheques not provided

class TenancyUpdate(BaseModel):
    tenant_name: Optional[str] = None
    tenant_email: Optional[EmailStr] = None
    tenant_phone: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    annual_rent: Optional[Decimal] = None
    contract_value: Optional[Decimal] = None
    security_deposit: Optional[Decimal] = None
    num_cheques: Optional[Literal[0, 1, 2, 3, 4, 6, 12]] = None
    ejari_number: Optional[str] = None
    notes: Optional[str] = None

class TenancyResponse(TenancyBase):
    id: UUID
    status: str
    previous_tenancy_id: Optional[UUID] = None
    termination_date: Optional[date] = None
    termination_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TenancyWithDetails(TenancyResponse):
    cheques: List[TenancyChequeResponse] = []
    documents: List[TenancyDocumentResponse] = []
    property_name: Optional[str] = None


# ============================================================================
# TENANCY LIFECYCLE SCHEMAS
# ============================================================================

class TenancyTerminate(BaseModel):
    termination_date: date
    termination_reason: str

class TenancyRenew(BaseModel):
    contract_start: date
    contract_end: date
    annual_rent: Decimal
    contract_value: Decimal
    security_deposit: Decimal = Decimal("0")
    num_cheques: Literal[0, 1, 2, 3, 4, 6, 12] = 1  # 0 = manual payments
    ejari_number: Optional[str] = None
    notes: Optional[str] = None
    cheques: Optional[List[TenancyChequeInput]] = None
    auto_split_cheques: bool = True


# ============================================================================
# ANNUAL REVENUE SCHEMAS
# ============================================================================

class AnnualRevenueResponse(BaseModel):
    total_cleared: Decimal
    total_pending: Decimal
    total_contract_value: Decimal
    active_tenancies: int


# ============================================================================
# UPCOMING CHEQUES (DASHBOARD) SCHEMAS
# ============================================================================

class UpcomingCheque(BaseModel):
    id: UUID
    tenancy_id: UUID
    property_id: UUID
    property_name: str
    tenant_name: str
    payment_method: Optional[str] = 'cheque'
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    reference_number: Optional[str] = None
    amount: Decimal
    due_date: date
    status: str
    days_until_due: int

class UpcomingChequesResponse(BaseModel):
    cheques: List[UpcomingCheque]
    total_amount: Decimal
    count: int
