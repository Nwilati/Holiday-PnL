from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine
from app.api import auth, properties, channels, categories, bookings, expenses, dashboard, receipts, tenancies, accounting, tax_reports, deposits, offplan

app = FastAPI(
    title=settings.APP_NAME,
    description="Holiday Home P&L Management System API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def run_migrations():
    """Run lightweight schema migrations on startup"""
    try:
        with engine.connect() as conn:
            # Add invoice_number column to expenses if not exists
            conn.execute(text("""
                ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)
            """))
            # Add unique constraint on invoice_number + property_id
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uix_expenses_invoice_property
                ON expenses (invoice_number, property_id)
                WHERE invoice_number IS NOT NULL
            """))
            # Add deposit_status column to tenancies if not exists
            conn.execute(text("""
                ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20) DEFAULT 'pending'
            """))
            # Ensure deposit_transactions table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS deposit_transactions (
                    id UUID PRIMARY KEY,
                    tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
                    transaction_type VARCHAR(20) NOT NULL,
                    amount NUMERIC(10, 2) NOT NULL,
                    transaction_date DATE NOT NULL,
                    description TEXT,
                    deduction_reason VARCHAR(50),
                    journal_entry_id UUID REFERENCES journal_entries(id),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    created_by UUID REFERENCES users(id)
                )
            """))
            conn.commit()
    except Exception as e:
        print(f"Warning: migration failed (may already be applied): {e}")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(properties.router, prefix="/api/v1")
app.include_router(channels.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(receipts.router, prefix="/api/v1")
app.include_router(tenancies.router, prefix="/api/v1")
app.include_router(accounting.router, prefix="/api/v1")
app.include_router(tax_reports.router, prefix="/api/v1")
app.include_router(deposits.router)
app.include_router(offplan.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Holiday Home P&L API", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
