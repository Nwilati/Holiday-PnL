from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date
from app.core.database import get_db
from app.models.models import Expense, Property, ExpenseCategory
from app.schemas.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.api.accounting import generate_expense_journal

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.get("", response_model=List[ExpenseResponse])
def get_expenses(
    property_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    is_paid: Optional[bool] = None,
    cost_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Expense)

    if property_id:
        query = query.filter(Expense.property_id == property_id)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    if is_paid is not None:
        query = query.filter(Expense.is_paid == is_paid)
    if cost_type:
        query = query.filter(Expense.cost_type == cost_type)

    expenses = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()
    return expenses

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(expense_data: ExpenseCreate, db: Session = Depends(get_db)):
    # Validate property exists
    property = db.query(Property).filter(Property.id == expense_data.property_id).first()
    if not property:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    # Validate category exists
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == expense_data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    expense_dict = expense_data.model_dump()
    expense_id = uuid4()

    payment_method_val = expense_dict.get('payment_method') or None

    sql = text("""
        INSERT INTO expenses (
            id, property_id, category_id, expense_date, vendor, description,
            amount, vat_amount, cost_type, is_booking_linked, linked_booking_id,
            payment_method, payment_date, payment_reference, is_paid,
            receipt_url, receipt_filename, notes, is_reconciled, reconciled_at, created_by
        ) VALUES (
            :id, :property_id, :category_id, :expense_date, :vendor, :description,
            :amount, :vat_amount, :cost_type, :is_booking_linked, :linked_booking_id,
            CAST(:payment_method AS payment_method), :payment_date, :payment_reference, :is_paid,
            :receipt_url, :receipt_filename, :notes, :is_reconciled, :reconciled_at, :created_by
        )
    """)

    db.execute(sql, {
        'id': expense_id,
        'property_id': expense_dict.get('property_id'),
        'category_id': expense_dict.get('category_id'),
        'expense_date': expense_dict.get('expense_date'),
        'vendor': expense_dict.get('vendor') or None,
        'description': expense_dict.get('description'),
        'amount': expense_dict.get('amount'),
        'vat_amount': expense_dict.get('vat_amount', 0),
        'cost_type': expense_dict.get('cost_type', 'variable'),
        'is_booking_linked': expense_dict.get('is_booking_linked', False),
        'linked_booking_id': expense_dict.get('linked_booking_id'),
        'payment_method': payment_method_val,
        'payment_date': expense_dict.get('payment_date'),
        'payment_reference': expense_dict.get('payment_reference'),
        'is_paid': expense_dict.get('is_paid', True),
        'receipt_url': expense_dict.get('receipt_url'),
        'receipt_filename': expense_dict.get('receipt_filename'),
        'notes': expense_dict.get('notes'),
        'is_reconciled': expense_dict.get('is_reconciled', False),
        'reconciled_at': expense_dict.get('reconciled_at'),
        'created_by': expense_dict.get('created_by'),
    })

    db.commit()

    expense = db.query(Expense).filter(Expense.id == expense_id).first()

    # Auto-generate journal entry
    try:
        generate_expense_journal(expense_id=expense.id, db=db)
    except Exception as e:
        print(f"Warning: Could not auto-generate journal for expense: {e}")

    return expense

@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: UUID, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: UUID, expense_data: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    update_data = expense_data.model_dump(exclude_unset=True)

    set_clauses = []
    params = {'id': expense_id}

    for field, value in update_data.items():
        if field == 'payment_method':
            set_clauses.append(f"payment_method = CAST(:{field} AS payment_method)")
        else:
            set_clauses.append(f"{field} = :{field}")
        params[field] = value if value != '' else None

    if set_clauses:
        sql = text(f"UPDATE expenses SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id")
        db.execute(sql, params)
        db.commit()

    db.refresh(expense)
    return expense

@router.delete("/{expense_id}")
def delete_expense(expense_id: UUID, db: Session = Depends(get_db)):
    """Delete an expense and its related journal entries"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Delete related journal lines first
    db.execute(
        text("DELETE FROM journal_lines WHERE expense_id = :expense_id"),
        {"expense_id": expense_id}
    )

    # Delete related receipts
    db.execute(
        text("DELETE FROM receipts WHERE expense_id = :expense_id"),
        {"expense_id": expense_id}
    )

    # Now delete the expense
    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted"}


@router.get("/report/detailed")
def get_detailed_expense_report(
    property_id: UUID,
    start_date: date,
    end_date: date,
    is_paid: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get detailed expense report with paid/unpaid breakdown"""

    # Base query for expenses
    query = db.query(Expense).filter(
        Expense.property_id == property_id,
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date
    )

    if is_paid is not None:
        query = query.filter(Expense.is_paid == is_paid)

    expenses = query.order_by(Expense.expense_date.desc()).all()

    # Get category names
    categories = {c.id: c.name for c in db.query(ExpenseCategory).all()}

    # Calculate totals
    total_amount = sum(float(e.total_amount or 0) for e in expenses)
    total_paid = sum(float(e.total_amount or 0) for e in expenses if e.is_paid)
    total_unpaid = sum(float(e.total_amount or 0) for e in expenses if not e.is_paid)

    # Category breakdown
    category_totals = {}
    for e in expenses:
        cat_name = categories.get(e.category_id, 'Unknown')
        if cat_name not in category_totals:
            category_totals[cat_name] = {'total': 0, 'paid': 0, 'unpaid': 0, 'count': 0}
        category_totals[cat_name]['total'] += float(e.total_amount or 0)
        category_totals[cat_name]['count'] += 1
        if e.is_paid:
            category_totals[cat_name]['paid'] += float(e.total_amount or 0)
        else:
            category_totals[cat_name]['unpaid'] += float(e.total_amount or 0)

    # Format category breakdown
    category_breakdown = [
        {
            'category': cat,
            'total': data['total'],
            'paid': data['paid'],
            'unpaid': data['unpaid'],
            'count': data['count'],
            'percentage': round(data['total'] / total_amount * 100, 1) if total_amount > 0 else 0
        }
        for cat, data in sorted(category_totals.items(), key=lambda x: x[1]['total'], reverse=True)
    ]

    # Format individual expenses
    expense_details = [
        {
            'id': str(e.id),
            'date': str(e.expense_date),
            'vendor': e.vendor or '',
            'category': categories.get(e.category_id, 'Unknown'),
            'description': e.description or '',
            'amount': float(e.amount or 0),
            'vat': float(e.vat_amount or 0),
            'total': float(e.total_amount or 0),
            'is_paid': e.is_paid,
            'payment_method': e.payment_method,
            'receipt_url': e.receipt_url
        }
        for e in expenses
    ]

    return {
        'summary': {
            'total_expenses': total_amount,
            'total_paid': total_paid,
            'total_unpaid': total_unpaid,
            'expense_count': len(expenses),
            'paid_count': sum(1 for e in expenses if e.is_paid),
            'unpaid_count': sum(1 for e in expenses if not e.is_paid)
        },
        'category_breakdown': category_breakdown,
        'expenses': expense_details
    }
