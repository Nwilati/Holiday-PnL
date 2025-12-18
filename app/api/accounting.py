from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.models.models import Account, JournalEntry, JournalLine, Booking, Expense, Property
from app.schemas.accounting_schemas import (
    AccountCreate, AccountUpdate, AccountResponse,
    JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse,
    JournalLineCreate, JournalLineResponse,
    AccountBalance, TrialBalanceResponse
)

router = APIRouter(prefix="/accounting", tags=["Accounting"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_journal_number(db: Session) -> str:
    """Generate next journal entry number: JE-YYYY-NNNNN"""
    year = datetime.now().year
    prefix = f"JE-{year}-"

    result = db.execute(text("""
        SELECT MAX(CAST(SUBSTRING(entry_number FROM 9) AS INTEGER))
        FROM journal_entries
        WHERE entry_number LIKE :prefix
    """), {"prefix": f"{prefix}%"}).scalar()

    next_seq = (result or 0) + 1
    return f"{prefix}{next_seq:05d}"


def get_account_by_code(db: Session, code: str) -> Account:
    """Get account by code, raise 404 if not found"""
    account = db.query(Account).filter(Account.code == code).first()
    if not account:
        raise HTTPException(status_code=404, detail=f"Account {code} not found")
    return account


def validate_journal_balance(lines: List[JournalLineCreate]) -> bool:
    """Ensure total debits equal total credits"""
    total_debit = sum(line.debit for line in lines)
    total_credit = sum(line.credit for line in lines)
    return total_debit == total_credit


# ============================================================================
# CHART OF ACCOUNTS
# ============================================================================

@router.get("/accounts", response_model=List[AccountResponse])
def get_accounts(
    account_type: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all accounts, optionally filtered by type"""
    query = db.query(Account)

    if account_type:
        query = query.filter(Account.account_type == account_type)
    if active_only:
        query = query.filter(Account.is_active == True)

    return query.order_by(Account.display_order, Account.code).all()


@router.get("/accounts/{account_id}", response_model=AccountResponse)
def get_account(account_id: UUID, db: Session = Depends(get_db)):
    """Get single account by ID"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(account_data: AccountCreate, db: Session = Depends(get_db)):
    """Create a new account"""
    # Check code is unique
    existing = db.query(Account).filter(Account.code == account_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Account code {account_data.code} already exists")

    account = Account(
        id=uuid4(),
        **account_data.model_dump()
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: UUID, account_data: AccountUpdate, db: Session = Depends(get_db)):
    """Update an account (cannot update system accounts' core fields)"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    update_dict = account_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: UUID, db: Session = Depends(get_db)):
    """Delete account (only if not system and no journal lines)"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system account")

    # Check for journal lines
    lines_count = db.query(JournalLine).filter(JournalLine.account_id == account_id).count()
    if lines_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete account with journal entries")

    db.delete(account)
    db.commit()


# ============================================================================
# JOURNAL ENTRIES
# ============================================================================

@router.get("/journals", response_model=List[JournalEntryResponse])
def get_journal_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    source: Optional[str] = None,
    property_id: Optional[UUID] = None,
    posted_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List journal entries with filters"""
    query = db.query(JournalEntry)

    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    if source:
        query = query.filter(JournalEntry.source == source)
    if posted_only:
        query = query.filter(JournalEntry.is_posted == True)
    if property_id:
        query = query.join(JournalLine).filter(JournalLine.property_id == property_id).distinct()

    entries = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.entry_number.desc()).offset(skip).limit(limit).all()

    # Add totals to response
    result = []
    for entry in entries:
        entry_dict = {
            "id": entry.id,
            "entry_number": entry.entry_number,
            "entry_date": entry.entry_date,
            "source": entry.source,
            "source_id": entry.source_id,
            "description": entry.description,
            "memo": entry.memo,
            "is_posted": entry.is_posted,
            "is_locked": entry.is_locked,
            "is_reversed": entry.is_reversed,
            "posted_at": entry.posted_at,
            "created_at": entry.created_at,
            "lines": [],
            "total_debit": Decimal('0'),
            "total_credit": Decimal('0')
        }

        for line in entry.lines:
            entry_dict["lines"].append({
                "id": line.id,
                "journal_entry_id": line.journal_entry_id,
                "account_id": line.account_id,
                "debit": line.debit,
                "credit": line.credit,
                "property_id": line.property_id,
                "booking_id": line.booking_id,
                "expense_id": line.expense_id,
                "tenancy_id": line.tenancy_id,
                "vat_treatment": line.vat_treatment,
                "vat_amount": line.vat_amount,
                "description": line.description,
                "line_order": line.line_order,
                "account_code": line.account.code if line.account else None,
                "account_name": line.account.name if line.account else None
            })
            entry_dict["total_debit"] += line.debit or Decimal('0')
            entry_dict["total_credit"] += line.credit or Decimal('0')

        result.append(entry_dict)

    return result


@router.get("/journals/{journal_id}", response_model=JournalEntryResponse)
def get_journal_entry(journal_id: UUID, db: Session = Depends(get_db)):
    """Get single journal entry with lines"""
    entry = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    total_debit = sum(line.debit or Decimal('0') for line in entry.lines)
    total_credit = sum(line.credit or Decimal('0') for line in entry.lines)

    return {
        **entry.__dict__,
        "lines": [{
            **line.__dict__,
            "account_code": line.account.code if line.account else None,
            "account_name": line.account.name if line.account else None
        } for line in entry.lines],
        "total_debit": total_debit,
        "total_credit": total_credit
    }


@router.post("/journals", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create_journal_entry(entry_data: JournalEntryCreate, db: Session = Depends(get_db)):
    """Create a manual journal entry"""
    # Validate balance
    if not validate_journal_balance(entry_data.lines):
        raise HTTPException(status_code=400, detail="Journal entry must balance (debits = credits)")

    if len(entry_data.lines) < 2:
        raise HTTPException(status_code=400, detail="Journal entry must have at least 2 lines")

    # Create entry
    entry = JournalEntry(
        id=uuid4(),
        entry_number=generate_journal_number(db),
        entry_date=entry_data.entry_date,
        source=entry_data.source,
        source_id=entry_data.source_id,
        description=entry_data.description,
        memo=entry_data.memo,
        is_posted=False
    )
    db.add(entry)
    db.flush()

    # Create lines
    for i, line_data in enumerate(entry_data.lines):
        # Verify account exists
        account = db.query(Account).filter(Account.id == line_data.account_id).first()
        if not account:
            raise HTTPException(status_code=400, detail=f"Account {line_data.account_id} not found")

        line = JournalLine(
            id=uuid4(),
            journal_entry_id=entry.id,
            account_id=line_data.account_id,
            debit=line_data.debit,
            credit=line_data.credit,
            property_id=line_data.property_id,
            booking_id=line_data.booking_id,
            expense_id=line_data.expense_id,
            tenancy_id=line_data.tenancy_id,
            vat_treatment=line_data.vat_treatment,
            vat_amount=line_data.vat_amount,
            description=line_data.description,
            line_order=i
        )
        db.add(line)

    db.commit()
    db.refresh(entry)

    return get_journal_entry(entry.id, db)


@router.post("/journals/{journal_id}/post", response_model=JournalEntryResponse)
def post_journal_entry(journal_id: UUID, db: Session = Depends(get_db)):
    """Post a journal entry (makes it final)"""
    entry = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    if entry.is_posted:
        raise HTTPException(status_code=400, detail="Journal entry already posted")

    if entry.is_locked:
        raise HTTPException(status_code=400, detail="Journal entry is locked")

    entry.is_posted = True
    entry.posted_at = datetime.now()
    db.commit()

    return get_journal_entry(journal_id, db)


@router.post("/journals/{journal_id}/reverse", response_model=JournalEntryResponse)
def reverse_journal_entry(journal_id: UUID, db: Session = Depends(get_db)):
    """Create a reversing entry"""
    original = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    if not original.is_posted:
        raise HTTPException(status_code=400, detail="Can only reverse posted entries")

    if original.is_reversed:
        raise HTTPException(status_code=400, detail="Journal entry already reversed")

    # Create reversing entry
    reversal = JournalEntry(
        id=uuid4(),
        entry_number=generate_journal_number(db),
        entry_date=date.today(),
        source='adjustment',
        source_id=original.id,
        description=f"Reversal of {original.entry_number}",
        memo=f"Reversing entry for: {original.description}",
        is_posted=True,
        posted_at=datetime.now()
    )
    db.add(reversal)
    db.flush()

    # Create reversed lines (swap debit/credit)
    for i, orig_line in enumerate(original.lines):
        line = JournalLine(
            id=uuid4(),
            journal_entry_id=reversal.id,
            account_id=orig_line.account_id,
            debit=orig_line.credit,  # Swapped
            credit=orig_line.debit,  # Swapped
            property_id=orig_line.property_id,
            booking_id=orig_line.booking_id,
            expense_id=orig_line.expense_id,
            tenancy_id=orig_line.tenancy_id,
            vat_treatment=orig_line.vat_treatment,
            vat_amount=orig_line.vat_amount,
            description=f"Reversal: {orig_line.description or ''}",
            line_order=i
        )
        db.add(line)

    # Mark original as reversed
    original.is_reversed = True
    original.reversed_by_id = reversal.id

    db.commit()

    return get_journal_entry(reversal.id, db)


@router.delete("/journals/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal_entry(journal_id: UUID, db: Session = Depends(get_db)):
    """Delete unposted journal entry"""
    entry = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    if entry.is_posted:
        raise HTTPException(status_code=400, detail="Cannot delete posted entry. Use reverse instead.")

    if entry.is_locked:
        raise HTTPException(status_code=400, detail="Cannot delete locked entry")

    db.delete(entry)
    db.commit()


# ============================================================================
# TRIAL BALANCE
# ============================================================================

@router.get("/trial-balance", response_model=TrialBalanceResponse)
def get_trial_balance(
    as_of_date: Optional[date] = None,
    property_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Generate trial balance report"""
    if not as_of_date:
        as_of_date = date.today()

    # Build query for account balances
    property_filter = "AND jl.property_id = :property_id" if property_id else ""

    sql = text(f"""
        SELECT
            a.id as account_id,
            a.code as account_code,
            a.name as account_name,
            a.account_type,
            COALESCE(SUM(jl.debit), 0) as debit_total,
            COALESCE(SUM(jl.credit), 0) as credit_total
        FROM accounts a
        LEFT JOIN journal_lines jl ON jl.account_id = a.id
        LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
            AND je.is_posted = TRUE
            AND je.entry_date <= :as_of_date
            {property_filter}
        WHERE a.is_active = TRUE
        GROUP BY a.id, a.code, a.name, a.account_type
        ORDER BY a.display_order, a.code
    """)

    params = {"as_of_date": as_of_date}
    if property_id:
        params["property_id"] = property_id

    result = db.execute(sql, params).fetchall()

    accounts = []
    total_debits = Decimal('0')
    total_credits = Decimal('0')

    for row in result:
        debit_total = Decimal(str(row.debit_total))
        credit_total = Decimal(str(row.credit_total))

        # Calculate balance based on account type
        # Assets & Expenses: Debit - Credit (positive = debit balance)
        # Liabilities, Equity, Revenue: Credit - Debit (positive = credit balance)
        if row.account_type in ('asset', 'expense'):
            balance = debit_total - credit_total
        else:
            balance = credit_total - debit_total

        # Only include accounts with activity
        if debit_total > 0 or credit_total > 0:
            accounts.append(AccountBalance(
                account_id=row.account_id,
                account_code=row.account_code,
                account_name=row.account_name,
                account_type=row.account_type,
                debit_total=debit_total,
                credit_total=credit_total,
                balance=balance
            ))
            total_debits += debit_total
            total_credits += credit_total

    return TrialBalanceResponse(
        as_of_date=as_of_date,
        accounts=accounts,
        total_debits=total_debits,
        total_credits=total_credits,
        is_balanced=(total_debits == total_credits)
    )


# ============================================================================
# AUTO-JOURNAL GENERATION
# ============================================================================

@router.post("/generate-journal/booking/{booking_id}", response_model=JournalEntryResponse)
def generate_booking_journal(booking_id: UUID, db: Session = Depends(get_db)):
    """Auto-generate journal entry for a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check if journal already exists
    existing = db.execute(text('''
        SELECT id, entry_number FROM journal_entries
        WHERE source = :source
        AND source_id = :source_id
        LIMIT 1
    '''), {'source': 'booking', 'source_id': booking_id}).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Journal entry already exists: {existing.entry_number}")

    # Get accounts (matching seeded COA)
    acc_receivable = get_account_by_code(db, '1201')   # OTA Receivables
    acc_revenue = get_account_by_code(db, '4101')      # Nightly Rate Revenue
    acc_cleaning_rev = get_account_by_code(db, '4102') # Cleaning Fee Revenue
    acc_commission = get_account_by_code(db, '5101')   # Airbnb Commission

    lines = []

    # Calculate amounts
    gross = Decimal(str(booking.gross_revenue or 0))
    commission = Decimal(str(booking.platform_commission or 0))
    cleaning = Decimal(str(booking.cleaning_fee or 0))

    # Net receivable (what we get from OTA)
    net_receivable = gross - commission

    # Accommodation revenue (gross minus cleaning)
    accommodation_rev = gross - cleaning

    # Line 1: Debit Receivable
    lines.append(JournalLineCreate(
        account_id=acc_receivable.id,
        debit=net_receivable,
        credit=Decimal('0'),
        property_id=booking.property_id,
        booking_id=booking_id,
        description=f"Receivable from {booking.guest_name}"
    ))

    # Line 2: Debit Commission Expense
    if commission > 0:
        lines.append(JournalLineCreate(
            account_id=acc_commission.id,
            debit=commission,
            credit=Decimal('0'),
            property_id=booking.property_id,
            booking_id=booking_id,
            description="Platform commission"
        ))

    # Line 3: Credit Accommodation Revenue
    if accommodation_rev > 0:
        lines.append(JournalLineCreate(
            account_id=acc_revenue.id,
            debit=Decimal('0'),
            credit=accommodation_rev,
            property_id=booking.property_id,
            booking_id=booking_id,
            description=f"Accommodation {booking.nights or 1} nights"
        ))

    # Line 4: Credit Cleaning Revenue
    if cleaning > 0:
        lines.append(JournalLineCreate(
            account_id=acc_cleaning_rev.id,
            debit=Decimal('0'),
            credit=cleaning,
            property_id=booking.property_id,
            booking_id=booking_id,
            description="Cleaning fee"
        ))

    # Create the journal entry
    entry_data = JournalEntryCreate(
        entry_date=booking.check_in,
        source='booking',
        source_id=booking_id,
        description=f"Booking: {booking.guest_name} ({booking.check_in} to {booking.check_out})",
        lines=lines
    )

    return create_journal_entry(entry_data, db)


@router.post("/generate-journal/expense/{expense_id}", response_model=JournalEntryResponse)
def generate_expense_journal(expense_id: UUID, db: Session = Depends(get_db)):
    """Auto-generate journal entry for an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check if journal already exists
    existing = db.execute(text('''
        SELECT id, entry_number FROM journal_entries
        WHERE source = :source
        AND source_id = :source_id
        LIMIT 1
    '''), {'source': 'expense', 'source_id': expense_id}).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Journal entry already exists: {existing.entry_number}")

    # Default accounts
    acc_expense = get_account_by_code(db, '5100')     # Operating Expenses
    acc_payable = get_account_by_code(db, '2100')     # Accounts Payable

    amount = Decimal(str(expense.amount or 0))
    vat = Decimal(str(expense.vat_amount or 0))
    total = Decimal(str(expense.total_amount or amount + vat))

    lines = []

    # Line 1: Debit Expense (including VAT for simplicity)
    lines.append(JournalLineCreate(
        account_id=acc_expense.id,
        debit=total,
        credit=Decimal('0'),
        property_id=expense.property_id,
        expense_id=expense_id,
        description=expense.description or expense.vendor
    ))

    # Line 2: Credit Payable
    lines.append(JournalLineCreate(
        account_id=acc_payable.id,
        debit=Decimal('0'),
        credit=total,
        property_id=expense.property_id,
        expense_id=expense_id,
        description=f"Payable to {expense.vendor}"
    ))

    entry_data = JournalEntryCreate(
        entry_date=expense.expense_date,
        source='expense',
        source_id=expense_id,
        description=f"Expense: {expense.vendor} - {expense.description or ''}",
        lines=lines
    )

    return create_journal_entry(entry_data, db)
