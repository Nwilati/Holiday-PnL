# Holiday Home P&L System - Project Memory

## Last Updated: January 16, 2026

---

## PROJECT STATUS: ✅ PRODUCTION - FEATURE RICH

### Production URLs
| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://holiday-pn-l.vercel.app | ✅ Live |
| Backend API | https://holiday-pnl-production.up.railway.app | ✅ Active |
| API Docs | https://holiday-pnl-production.up.railway.app/docs | ✅ Accessible |
| Database | Neon PostgreSQL (ep-calm-star-aguss7in) | ✅ Connected |

### GitHub Repository
https://github.com/Nwilati/Holiday-PnL

---

## TECH STACK

### Backend
- **Framework:** FastAPI
- **Database:** PostgreSQL (Neon)
- **ORM:** SQLAlchemy 2.0
- **Driver:** psycopg3 (psycopg[binary]==3.2.3)
- **Hosting:** Railway
- **Python Version:** 3.13 (Railway default)

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI:** Tailwind CSS + Recharts
- **Export:** xlsx library for Excel exports
- **Hosting:** Vercel

---

## DATABASE SCHEMA

### Core Tables
1. **users** - User authentication
2. **properties** - Holiday home properties
3. **channels** - Booking channels (Airbnb, Booking.com, etc.)
4. **bookings** - Guest reservations with revenue calculations
5. **expenses** - Property expenses with categories
6. **expense_categories** - Expense categorization
7. **calendar_blocks** - Blocked dates
8. **attachments** - File attachments
9. **audit_log** - Change tracking

### Tenancy Tables
10. **tenancies** - Long-term rental contracts
11. **tenancy_payments** - Cheque payment tracking

### Accounting Tables
12. **journal_entries** - Double-entry accounting
13. **journal_entry_lines** - Debit/credit lines
14. **accounts** - Chart of accounts

### Off-Plan Property Tables
15. **offplan_properties** - Off-plan property investments
16. **offplan_payments** - Payment schedule/installments
17. **offplan_documents** - SPA, offer letters, receipts

### Custom PostgreSQL Enum Types
- `booking_status`: pending, confirmed, checked_in, completed, cancelled, no_show
- `payment_method`: cash, bank_transfer, credit_card, cheque, other
- `tenancy_status`: active, expired, terminated, renewed
- `cheque_status`: pending, deposited, cleared, bounced, cancelled, replaced
- `emirate`: abu_dhabi, dubai, sharjah, ajman, ras_al_khaimah, fujairah, umm_al_quwain
- `offplan_status`: active, handed_over, cancelled
- `offplan_payment_status`: pending, paid, overdue

---

## FEATURES COMPLETED

### Phase 1 - Core MVP ✅
- [x] Dashboard with KPIs (Revenue, NOI, Occupancy, ADR, RevPAR)
- [x] Revenue trend chart (monthly)
- [x] Channel mix pie chart
- [x] Expense breakdown chart
- [x] Property selector
- [x] Bookings Management (CRUD, auto-calculations)
- [x] Expenses Management (CRUD, VAT, categories)
- [x] Properties listing
- [x] User authentication

### Phase 2 - Rentals & Accounting ✅
- [x] **Tenancies Module** - Long-term rental management
  - Tenant details, contract dates, rent amount
  - Cheque payment tracking with due dates
  - Payment status (pending, deposited, cleared, bounced)
  - Dashboard integration with upcoming cheques
- [x] **Accounting Module** - Double-entry bookkeeping
  - Journal entries with debit/credit lines
  - Chart of accounts
  - Trial balance view
- [x] **Tax Reports** - VAT reporting
  - Period-based VAT calculations
  - Input/Output VAT summary
- [x] **Deposits Management** - Security deposit tracking

### Phase 3 - Off-Plan Properties ✅
- [x] **Off-Plan Portfolio Management**
  - Developer, project, unit details
  - Location by emirate (Abu Dhabi, Dubai, etc.)
  - Auto-calculated land department fees (2% Abu Dhabi, 4% Dubai)
  - Property status tracking (active, handed_over, cancelled)
- [x] **Payment Schedule**
  - Multiple installment payments per property
  - Milestone-based payments (Booking, Construction %, Handover)
  - Quick presets: Standard 60/40, Construction Linked
  - Due date tracking with reminders
  - Mark payments as paid with method and reference
  - Overdue payment detection
- [x] **Cost Breakdown Display**
  - Base price, Land Dept Fee, Admin Fees, Other Fees
  - Total cost calculation
- [x] **Document Management**
  - Upload SPA, offer letters, payment receipts
  - Base64 encoded storage
  - Document type categorization
- [x] **Dashboard Integration**
  - Off-Plan Investment Summary widget
  - Upcoming payments widget (30-day view)
  - Color-coded urgency (red <7 days, yellow 7-14, green >14)
- [x] **Export Reports**
  - Payment schedule PDF
  - Investment summary Excel

---

## CRITICAL DEPLOYMENT NOTES

### psycopg3 Enum Handling
Railway uses Python 3.13 which requires psycopg3. This driver handles PostgreSQL enums differently than psycopg2.

**Solution:** Use raw SQL with CAST() for enum columns:

```python
# For booking status
sql = text("""
    INSERT INTO bookings (..., status, ...) 
    VALUES (..., CAST(:status AS booking_status), ...)
""")

# For off-plan emirate
sql = text("""
    INSERT INTO offplan_properties (..., emirate, ...) 
    VALUES (..., CAST(:emirate AS emirate), ...)
""")

# For off-plan payment status
sql = text("""
    UPDATE offplan_payments SET status = CAST('paid' AS offplan_payment_status)
""")
```

**Affected files:**
- `app/api/bookings.py`
- `app/api/expenses.py`
- `app/api/tenancies.py`
- `app/api/offplan.py`
- `app/api/dashboard.py`

### Database URL Format
```python
# Convert in database.py
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://")
```

### Model Enum Definition
Use `create_type=False` for psycopg3 compatibility:
```python
emirate = Column(PgEnum('abu_dhabi', 'dubai', ..., name='emirate', create_type=False))
```

---

## ENVIRONMENT VARIABLES (Railway)

```
DATABASE_URL=postgresql+psycopg://neondb_owner:***@ep-calm-star-aguss7in-pooler.c-2.eu-central-1.aws.neon.tech/holiday_pnl?sslmode=require
SECRET_KEY=holiday-pnl-secret-key-2025-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
APP_NAME=Holiday Home PnL
DEBUG=False
```

---

## FILE STRUCTURE

```
Holiday-PnL/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── bookings.py
│   │   ├── categories.py
│   │   ├── channels.py
│   │   ├── dashboard.py
│   │   ├── expenses.py
│   │   ├── properties.py
│   │   ├── receipts.py
│   │   ├── tenancies.py        # Long-term rentals
│   │   ├── accounting.py       # Journal entries
│   │   ├── tax_reports.py      # VAT reports
│   │   ├── deposits.py         # Security deposits
│   │   └── offplan.py          # Off-plan properties
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   │   └── models.py           # All SQLAlchemy models
│   └── schemas/
│       └── schemas.py          # All Pydantic schemas
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # API client with all types
│   │   ├── components/
│   │   │   ├── DataTable.tsx
│   │   │   ├── KPICard.tsx
│   │   │   └── Layout.tsx      # Navigation sidebar
│   │   └── pages/
│   │       ├── Dashboard.tsx   # Main dashboard with widgets
│   │       ├── Bookings.tsx
│   │       ├── Expenses.tsx
│   │       ├── Properties.tsx
│   │       ├── Calendar.tsx
│   │       ├── Reports.tsx
│   │       ├── Tenancies.tsx   # Long-term rentals
│   │       ├── Accounting.tsx  # Journal entries
│   │       ├── TaxReports.tsx  # VAT reports
│   │       ├── OffPlan.tsx     # Off-plan portfolio
│   │       ├── Users.tsx
│   │       └── Login.tsx
│   ├── package.json            # Includes xlsx dependency
│   └── vercel.json
├── Procfile
├── requirements.txt
└── main.py
```

---

## API ENDPOINTS

### Off-Plan Properties
```
GET    /api/v1/offplan/properties                    # List all
POST   /api/v1/offplan/properties                    # Create with payments
GET    /api/v1/offplan/properties/{id}               # Get with details
PUT    /api/v1/offplan/properties/{id}               # Update
DELETE /api/v1/offplan/properties/{id}               # Delete

# Payments
GET    /api/v1/offplan/properties/{id}/payments      # List payments
POST   /api/v1/offplan/properties/{id}/payments      # Add payment
PUT    /api/v1/offplan/payments/{id}                 # Update payment
DELETE /api/v1/offplan/payments/{id}                 # Delete payment
POST   /api/v1/offplan/payments/{id}/mark-paid       # Mark as paid

# Documents
GET    /api/v1/offplan/properties/{id}/documents     # List documents
POST   /api/v1/offplan/properties/{id}/documents     # Upload document
GET    /api/v1/offplan/documents/{id}                # Download document
DELETE /api/v1/offplan/documents/{id}                # Delete document

# Dashboard
GET    /api/v1/offplan/dashboard/upcoming-payments   # Next 30 days
GET    /api/v1/offplan/dashboard/summary             # Investment overview
```

### Tenancies
```
GET    /api/v1/tenancies                             # List all
POST   /api/v1/tenancies                             # Create
GET    /api/v1/tenancies/{id}                        # Get details
PUT    /api/v1/tenancies/{id}                        # Update
DELETE /api/v1/tenancies/{id}                        # Delete
GET    /api/v1/tenancies/{id}/payments               # List payments
POST   /api/v1/tenancies/{id}/payments               # Add payment
PUT    /api/v1/tenancy-payments/{id}                 # Update payment
DELETE /api/v1/tenancy-payments/{id}                 # Delete payment
```

---

## SAMPLE DATA

### Off-Plan Property (Gardenia - Fahid Beach Terraces)
- Developer: Aldar
- Project: Fahid Beach Terraces
- Unit: 306
- Emirate: Abu Dhabi
- Base Price: AED 9,967,286
- Land Dept Fee (2%): AED 199,346
- Admin Fees: AED 3,150
- Total Cost: AED 10,169,782
- Payment Plan: 7 installments (10%, 5%, 10%, 10%, 15%, 15%, 35%)

---

## TROUBLESHOOTING

### "CORS Error" in browser
1. Check Railway logs - usually indicates backend crash
2. Test endpoint directly in Swagger /docs
3. Verify enum type names in SQL CAST statements

### "500 Internal Server Error" on Off-Plan
1. Check enum names: `emirate` (not `emirate_type`)
2. Check enum names: `offplan_status` (not `offplan_status_type`)
3. Check enum names: `offplan_payment_status`

### Duplicate Payments Issue
- Ensure form tracks existing payments (with id) vs new payments
- Only call addOffplanPayment for payments without id
- Add loading state to prevent double-click submissions

---

## PENDING FEATURES (Future)

### High Priority
- [ ] Email notifications for payment reminders
- [ ] Handover conversion (off-plan to rental property)
- [ ] Multi-user permissions

### Medium Priority
- [ ] iCal sync with OTAs
- [ ] Recurring expenses
- [ ] Budget vs actual comparison
- [ ] Mobile app

### Low Priority
- [ ] Dark mode
- [ ] Multi-currency support
- [ ] AI-powered insights