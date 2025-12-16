from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date
from app.core.database import get_db
from app.models.models import Expense, Property, ExpenseCategory
from app.schemas.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse

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

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: UUID, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return None
