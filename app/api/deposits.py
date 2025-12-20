from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Tenancy, Property, JournalEntry, JournalLine, Account
from app.api.auth import get_current_user
from app.api.accounting import get_account_by_code, generate_journal_number

router = APIRouter(prefix="/api/v1/deposits", tags=["Security Deposits"])


class DepositTransactionCreate(BaseModel):
    tenancy_id: UUID
    transaction_type: str  # 'received', 'deduction', 'refund'
    amount: Decimal
    transaction_date: date
    description: Optional[str] = None
    deduction_reason: Optional[str] = None  # For deductions: 'damages', 'cleaning', 'unpaid_rent', 'other'


class DepositTransactionResponse(BaseModel):
    id: UUID
    tenancy_id: UUID
    transaction_type: str
    amount: Decimal
    transaction_date: date
    description: Optional[str]
    deduction_reason: Optional[str]
    journal_entry_id: Optional[UUID]
    created_at: date


class DepositSummary(BaseModel):
    tenancy_id: UUID
    tenant_name: str
    property_name: str
    deposit_amount: Decimal
    received: Decimal
    deductions: Decimal
    refunded: Decimal
    balance: Decimal
    status: str


@router.post("/transactions")
async def create_deposit_transaction(
    transaction: DepositTransactionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Record a deposit transaction (received, deduction, or refund)"""

    # Get tenancy
    tenancy = db.query(Tenancy).filter(Tenancy.id == transaction.tenancy_id).first()
    if not tenancy:
        raise HTTPException(status_code=404, detail="Tenancy not found")

    # Get property for journal
    property = db.query(Property).filter(Property.id == tenancy.property_id).first()

    # Get accounts
    acc_bank = get_account_by_code(db, '1102')  # CBD Bank
    acc_deposit_held = get_account_by_code(db, '2302')  # Tenant Security Deposits
    acc_deposit_forfeit = get_account_by_code(db, '4301')  # Deposit Forfeitures (income)

    # Create journal entry based on transaction type
    journal_lines = []

    if transaction.transaction_type == 'received':
        # Debit Bank, Credit Deposit Liability
        description = f"Security deposit received - {tenancy.tenant_name}"
        journal_lines = [
            {
                'account_id': acc_bank.id,
                'debit': transaction.amount,
                'credit': Decimal('0'),
                'description': f'Deposit received from {tenancy.tenant_name}'
            },
            {
                'account_id': acc_deposit_held.id,
                'debit': Decimal('0'),
                'credit': transaction.amount,
                'description': f'Security deposit held for {tenancy.tenant_name}'
            }
        ]

    elif transaction.transaction_type == 'refund':
        # Debit Deposit Liability, Credit Bank
        description = f"Security deposit refund - {tenancy.tenant_name}"
        journal_lines = [
            {
                'account_id': acc_deposit_held.id,
                'debit': transaction.amount,
                'credit': Decimal('0'),
                'description': f'Deposit refund to {tenancy.tenant_name}'
            },
            {
                'account_id': acc_bank.id,
                'debit': Decimal('0'),
                'credit': transaction.amount,
                'description': f'Deposit refund paid'
            }
        ]

    elif transaction.transaction_type == 'deduction':
        # Debit Deposit Liability, Credit Income (forfeit)
        reason = transaction.deduction_reason or 'other'
        description = f"Security deposit deduction ({reason}) - {tenancy.tenant_name}"
        journal_lines = [
            {
                'account_id': acc_deposit_held.id,
                'debit': transaction.amount,
                'credit': Decimal('0'),
                'description': f'Deposit deduction - {reason}'
            },
            {
                'account_id': acc_deposit_forfeit.id,
                'debit': Decimal('0'),
                'credit': transaction.amount,
                'description': f'Deposit forfeiture income - {reason}'
            }
        ]
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type")

    # Create journal entry
    entry_number = generate_journal_number(db)
    journal_entry = JournalEntry(
        entry_number=entry_number,
        entry_date=transaction.transaction_date,
        source='adjustment',
        source_id=tenancy.id,
        description=description,
        is_posted=True
    )
    db.add(journal_entry)
    db.flush()

    # Add journal lines
    for i, line in enumerate(journal_lines):
        db_line = JournalLine(
            journal_entry_id=journal_entry.id,
            account_id=line['account_id'],
            debit=line['debit'],
            credit=line['credit'],
            property_id=property.id,
            tenancy_id=tenancy.id,
            description=line['description'],
            line_order=i
        )
        db.add(db_line)

    # Create deposit transaction record
    from app.models.models import DepositTransaction
    db_transaction = DepositTransaction(
        tenancy_id=tenancy.id,
        transaction_type=transaction.transaction_type,
        amount=transaction.amount,
        transaction_date=transaction.transaction_date,
        description=transaction.description,
        deduction_reason=transaction.deduction_reason,
        journal_entry_id=journal_entry.id,
        created_by=current_user.id
    )
    db.add(db_transaction)

    # Update tenancy deposit status
    tenancy.deposit_status = calculate_deposit_status(db, tenancy.id, tenancy.security_deposit or 0)

    db.commit()

    return {"message": "Transaction recorded", "journal_entry": entry_number}


def calculate_deposit_status(db: Session, tenancy_id: UUID, deposit_amount: Decimal) -> str:
    """Calculate deposit status based on transactions"""
    from app.models.models import DepositTransaction

    transactions = db.query(DepositTransaction).filter(
        DepositTransaction.tenancy_id == tenancy_id
    ).all()

    received = sum(t.amount for t in transactions if t.transaction_type == 'received')
    deductions = sum(t.amount for t in transactions if t.transaction_type == 'deduction')
    refunded = sum(t.amount for t in transactions if t.transaction_type == 'refund')

    if received == 0:
        return 'pending'

    balance = received - deductions - refunded

    if balance <= 0:
        if deductions >= received:
            return 'forfeited'
        return 'refunded'
    elif refunded > 0 or deductions > 0:
        return 'partially_refunded'
    else:
        return 'received'


@router.get("/transactions/{tenancy_id}")
async def get_deposit_transactions(
    tenancy_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all deposit transactions for a tenancy"""
    from app.models.models import DepositTransaction

    transactions = db.query(DepositTransaction).filter(
        DepositTransaction.tenancy_id == tenancy_id
    ).order_by(DepositTransaction.transaction_date).all()

    return transactions


@router.get("/summary")
async def get_deposits_summary(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get summary of all security deposits"""
    from app.models.models import DepositTransaction

    query = db.query(Tenancy).filter(Tenancy.security_deposit > 0)

    if status:
        query = query.filter(Tenancy.deposit_status == status)

    tenancies = query.all()

    summaries = []
    for tenancy in tenancies:
        property = db.query(Property).filter(Property.id == tenancy.property_id).first()

        transactions = db.query(DepositTransaction).filter(
            DepositTransaction.tenancy_id == tenancy.id
        ).all()

        received = sum(t.amount for t in transactions if t.transaction_type == 'received')
        deductions = sum(t.amount for t in transactions if t.transaction_type == 'deduction')
        refunded = sum(t.amount for t in transactions if t.transaction_type == 'refund')
        balance = received - deductions - refunded

        summaries.append(DepositSummary(
            tenancy_id=tenancy.id,
            tenant_name=tenancy.tenant_name,
            property_name=property.name if property else 'Unknown',
            deposit_amount=tenancy.security_deposit or Decimal('0'),
            received=received,
            deductions=deductions,
            refunded=refunded,
            balance=balance,
            status=tenancy.deposit_status or 'pending'
        ))

    return summaries
