from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.core.database import get_db
from app.models.models import ExpenseCategory
from app.schemas.schemas import ExpenseCategoryCreate, ExpenseCategoryResponse

router = APIRouter(prefix="/categories", tags=["Expense Categories"])

@router.get("", response_model=List[ExpenseCategoryResponse])
def get_categories(
    category_type: str = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(ExpenseCategory)
    if is_active is not None:
        query = query.filter(ExpenseCategory.is_active == is_active)
    if category_type:
        query = query.filter(ExpenseCategory.category_type == category_type)
    categories = query.order_by(ExpenseCategory.display_order).all()
    return categories

@router.get("/tree", response_model=List[ExpenseCategoryResponse])
def get_categories_tree(db: Session = Depends(get_db)):
    """Get categories organized by parent (for dropdown menus)"""
    categories = db.query(ExpenseCategory).filter(
        ExpenseCategory.is_active == True
    ).order_by(ExpenseCategory.display_order).all()
    return categories

@router.post("", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category_data: ExpenseCategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(ExpenseCategory).filter(
        ExpenseCategory.code == category_data.code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category code already exists"
        )

    category = ExpenseCategory(**category_data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.get("/{category_id}", response_model=ExpenseCategoryResponse)
def get_category(category_id: UUID, db: Session = Depends(get_db)):
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category
