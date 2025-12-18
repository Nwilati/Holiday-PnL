from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal


# ============================================================================
# ACCOUNT SCHEMAS
# ============================================================================

class AccountBase(BaseModel):
    code: str
    name: str
    account_type: str  # asset/liability/equity/revenue/expense
    parent_code: Optional[str] = None
    is_active: bool = True
    allow_manual_entries: bool = True
    default_vat_treatment: str = 'out_of_scope'
    description: Optional[str] = None
    display_order: int = 0


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    allow_manual_entries: Optional[bool] = None
    default_vat_treatment: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None


class AccountResponse(AccountBase):
    id: UUID
    is_system: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# JOURNAL LINE SCHEMAS
# ============================================================================

class JournalLineBase(BaseModel):
    account_id: UUID
    debit: Decimal = Decimal('0')
    credit: Decimal = Decimal('0')
    property_id: Optional[UUID] = None
    booking_id: Optional[UUID] = None
    expense_id: Optional[UUID] = None
    tenancy_id: Optional[UUID] = None
    vat_treatment: str = 'out_of_scope'
    vat_amount: Decimal = Decimal('0')
    description: Optional[str] = None


class JournalLineCreate(JournalLineBase):
    pass


class JournalLineResponse(JournalLineBase):
    id: UUID
    journal_entry_id: UUID
    line_order: int
    account_code: Optional[str] = None
    account_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# JOURNAL ENTRY SCHEMAS
# ============================================================================

class JournalEntryBase(BaseModel):
    entry_date: date
    description: str
    memo: Optional[str] = None


class JournalEntryCreate(JournalEntryBase):
    source: str = 'manual'
    source_id: Optional[UUID] = None
    lines: List[JournalLineCreate]


class JournalEntryUpdate(BaseModel):
    entry_date: Optional[date] = None
    description: Optional[str] = None
    memo: Optional[str] = None
    lines: Optional[List[JournalLineCreate]] = None


class JournalEntryResponse(JournalEntryBase):
    id: UUID
    entry_number: str
    source: str
    source_id: Optional[UUID]
    is_posted: bool
    is_locked: bool
    is_reversed: bool
    posted_at: Optional[datetime]
    created_at: datetime
    lines: List[JournalLineResponse] = []
    total_debit: Decimal = Decimal('0')
    total_credit: Decimal = Decimal('0')

    class Config:
        from_attributes = True


# ============================================================================
# TRIAL BALANCE / REPORTS
# ============================================================================

class AccountBalance(BaseModel):
    account_id: UUID
    account_code: str
    account_name: str
    account_type: str
    debit_total: Decimal
    credit_total: Decimal
    balance: Decimal


class TrialBalanceResponse(BaseModel):
    as_of_date: date
    accounts: List[AccountBalance]
    total_debits: Decimal
    total_credits: Decimal
    is_balanced: bool
