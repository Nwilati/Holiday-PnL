from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import uuid4
from datetime import datetime, timedelta
import jwt
import bcrypt
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "viewer"

class UserUpdate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "viewer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = db.execute(
        text("SELECT id, email, full_name, role FROM users WHERE id = :id"),
        {"id": user_id}
    )
    user = result.fetchone()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role}

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    """Create new user - Admin only"""
    # Check if email exists
    result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": user.email})
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = uuid4()
    hashed_pw = hash_password(user.password)

    db.execute(
        text("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (:id, :email, :password_hash, :full_name, :role::user_role)
        """),
        {
            "id": user_id,
            "email": user.email,
            "password_hash": hashed_pw,
            "full_name": user.full_name,
            "role": user.role
        }
    )
    db.commit()

    return {"id": str(user_id), "email": user.email, "full_name": user.full_name, "role": user.role}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT id, email, password_hash, full_name, role FROM users WHERE email = :email"),
        {"email": user.email}
    )
    db_user = result.fetchone()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ============ USER MANAGEMENT (Admin Only) ============

@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    """List all users - Admin only"""
    result = db.execute(text("SELECT id, email, full_name, role FROM users ORDER BY email"))
    users = []
    for row in result:
        users.append({
            "id": str(row.id),
            "email": row.email,
            "full_name": row.full_name,
            "role": row.role
        })
    return users

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: str, user: UserUpdate, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    """Update user - Admin only"""
    # Check user exists
    result = db.execute(text("SELECT id FROM users WHERE id = :id"), {"id": user_id})
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Update with or without password
    if user.password:
        hashed_pw = hash_password(user.password)
        db.execute(
            text("""
                UPDATE users SET email = :email, password_hash = :password_hash,
                full_name = :full_name, role = CAST(:role AS user_role), updated_at = NOW()
                WHERE id = :id
            """),
            {
                "id": user_id,
                "email": user.email,
                "password_hash": hashed_pw,
                "full_name": user.full_name,
                "role": user.role
            }
        )
    else:
        db.execute(
            text("""
                UPDATE users SET email = :email, full_name = :full_name,
                role = CAST(:role AS user_role), updated_at = NOW()
                WHERE id = :id
            """),
            {
                "id": user_id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        )
    db.commit()

    return {"id": user_id, "email": user.email, "full_name": user.full_name, "role": user.role}

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), admin: dict = Depends(require_admin)):
    """Delete user - Admin only"""
    # Prevent self-deletion
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = db.execute(
        text("DELETE FROM users WHERE id = :id RETURNING id"),
        {"id": user_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    db.commit()
    return {"message": "User deleted"}

@router.post("/reset-password-temp")
def reset_password_temp(email: str, new_password: str, db: Session = Depends(get_db)):
    """TEMPORARY - Remove after use"""
    hashed_pw = hash_password(new_password)
    db.execute(
        text("UPDATE users SET password_hash = :hash WHERE email = :email"),
        {"hash": hashed_pw, "email": email}
    )
    db.commit()
    return {"message": "Password reset", "email": email}
