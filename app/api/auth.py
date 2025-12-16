from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from uuid import uuid4, UUID
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.models import User
from app.schemas.schemas import UserCreate, UserResponse, UserLogin, Token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user_id = uuid4()
    password_hash = get_password_hash(user_data.password)

    # Use raw SQL to handle enum type
    sql = text("""
        INSERT INTO users (id, email, password_hash, full_name, role, is_active)
        VALUES (:id, :email, :password_hash, :full_name, CAST(:role AS user_role), :is_active)
    """)

    db.execute(sql, {
        'id': user_id,
        'email': user_data.email,
        'password_hash': password_hash,
        'full_name': user_data.full_name,
        'role': user_data.role or 'viewer',
        'is_active': True,
    })
    db.commit()

    # Fetch the created user
    user = db.query(User).filter(User.id == user_id).first()
    return user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Update last login using raw SQL
    db.execute(
        text("UPDATE users SET last_login = :now WHERE id = :id"),
        {'now': datetime.utcnow(), 'id': user.id}
    )
    db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
