# Holiday Home P&L Management System - Project Memory

> **Last Updated:** 2025-12-15
> **Status:** MVP Phase - Core System Working ✅
> **Current Chat:** 1

---

## 1. Project Overview

**Goal:** Build a single system to run a holiday-home P&L like a business

**Core Capabilities:**
- Track bookings (channels, dates, rates, fees, taxes, discounts)
- Track expenses (fixed/variable) with receipts
- Track occupancy and pricing performance
- Produce financial statements and executive dashboard

**Target User:** Property owner in UAE (Dubai)

---

## 2. Key Decisions Log

| Date | Decision | Choice | Rationale |
|------|----------|--------|-----------|
| 2025-12-15 | Project initiated | ✅ | Starting foundation |
| 2025-12-15 | Channels | ✅ Airbnb, Booking.com + extensible | Keep option to add more channels |
| 2025-12-15 | Accounting basis | ✅ Cash basis | Track payment methods (cash/card/online) |
| 2025-12-15 | Property scope | ✅ Multi-property ready | Starting with 1, architected for growth |
| 2025-12-15 | VAT | ✅ VAT registered | Must track VAT on expenses |
| 2025-12-15 | Tourism/Municipality fees | ✅ Registered, platform-handled | Track for records, platforms remit |
| 2025-12-15 | Fiscal year | ✅ Calendar year (Jan-Dec) | Standard reporting periods |
| 2025-12-15 | Historical data | ✅ Manual entry | Will test system with real data |

---

## 3. Technical Architecture

### Selected Stack (TBD - Confirm)
```
Backend:    Python (FastAPI) - lightweight, fast, good for APIs
Database:   PostgreSQL - robust, relational, good for financial data
Frontend:   React + Tailwind CSS - modern dashboard
Auth:       Email + 2FA (future)
Storage:    S3-compatible for receipts
Hosting:    TBD (Render/Fly.io/AWS)
```

### Alternative Considered
- Django (heavier but more batteries-included)
- Node.js/NestJS (if JS preferred)

---

## 4. Data Model Summary

### Core Tables (Draft)
```
properties          - Property details, settings
bookings            - Reservation ledger
expenses            - Expense ledger
calendar_blocks     - Non-revenue nights
channels            - Channel configuration
categories          - Chart of accounts
assets              - Inventory/equipment (Phase 2+)
users               - User accounts and roles
audit_log           - All changes tracked
attachments         - Receipt/document storage
```

### Currency & Locale
- Primary Currency: AED
- Timezone: Asia/Dubai (UTC+4)
- Fiscal Year: TBD (Calendar year or custom?)

---

## 5. Phase Plan & Progress

### Phase 1: MVP ✅ COMPLETE
- [x] Database schema design ✅
- [x] Backend project setup (FastAPI) ✅
- [x] User authentication ✅
- [x] Property CRUD ✅
- [x] Booking CRUD ✅
- [x] Expense CRUD ✅
- [x] Dashboard API endpoints ✅
- [x] Frontend (React + Tailwind) ✅
- [ ] Exports (monthly P&L, ledger exports) ← NEXT

### Phase 2: Accuracy & Control
- [ ] Bank/payout reconciliation
- [ ] Good/bad month scoring
- [ ] Calendar heatmap
- [ ] Channel mix analytics

### Phase 3: Automation & Operations
- [ ] Channel integrations (API/iCal)
- [ ] Cleaning/maintenance tickets
- [ ] Renewal reminders
- [ ] Forecasting

### Phase 4: Advanced Finance
- [ ] Capex vs Opex tracking
- [ ] Depreciation
- [ ] Multi-property support
- [ ] Budget vs actuals

---

## 6. Chart of Accounts (UAE Holiday Home)

### Revenue Categories
```
4000 - REVENUE
  4100 - Accommodation Revenue
    4101 - Nightly Rate Revenue
    4102 - Cleaning Fees Collected
    4103 - Extra Guest Fees
    4104 - Late Checkout Fees
    4105 - Other Service Fees
  4200 - Taxes/Fees Collected (Pass-through)
    4201 - Tourism Dirham Collected
    4202 - Municipality Fee Collected
    4203 - VAT Collected (if applicable)
```

### Expense Categories
```
5000 - OPERATING EXPENSES
  5100 - Platform & Payment Fees
    5101 - Airbnb Commission
    5102 - Booking.com Commission
    5103 - Payment Processing Fees
    5104 - Channel Manager Fees
  5200 - Utilities
    5201 - DEWA (Electric & Water)
    5202 - District Cooling (Empower/Emicool)
    5203 - Internet/WiFi
    5204 - Gas (if applicable)
  5300 - Cleaning & Laundry
    5301 - Turnover Cleaning
    5302 - Deep Cleaning
    5303 - Laundry Service
    5304 - Cleaning Supplies
  5400 - Supplies & Amenities
    5401 - Toiletries
    5402 - Kitchen Supplies
    5403 - Linens & Towels
    5404 - Guest Amenities
  5500 - Maintenance & Repairs
    5501 - AC Service/Repair
    5502 - Plumbing
    5503 - Electrical
    5504 - Appliance Repair
    5505 - General Handyman
    5506 - Pest Control
  5600 - Property Costs
    5601 - Service Charges (HOA)
    5602 - Insurance
    5603 - DTCM License/Permit
    5604 - Ejari Fee
  5700 - Management
    5701 - Co-host/Property Manager Fee
    5702 - Virtual Assistant
  5800 - Marketing
    5801 - Photography
    5802 - Listing Optimization
    5803 - Direct Booking Marketing

6000 - OTHER EXPENSES
  6100 - Bank Charges
  6200 - Professional Fees (Accounting/Legal)
  6300 - Miscellaneous

7000 - CAPITAL EXPENDITURE (Non-Operating)
  7100 - Furniture
  7200 - Appliances
  7300 - Electronics
  7400 - Renovations/Improvements
```

---

## 7. Dashboard KPIs (Target Metrics)

### Primary KPIs
| Metric | Formula | Good Threshold | Notes |
|--------|---------|----------------|-------|
| Gross Revenue | Sum of all booking revenue | - | Before any deductions |
| Net Revenue | Gross - Platform Fees - Payment Fees | - | After channel costs |
| NOI | Net Revenue - Operating Expenses | >60% of Net Rev | Key profitability metric |
| Occupancy % | Booked Nights / Available Nights | >70% | Excludes owner blocks |
| ADR | Net Revenue / Booked Nights | Market dependent | Average Daily Rate |
| RevPAR | Net Revenue / Available Nights | - | Revenue per available night |
| Expense Ratio | Operating Expenses / Net Revenue | <40% | Lower is better |

### Good/Bad Month Logic (Draft)
```
GOOD MONTH if:
  - Occupancy >= 70% AND
  - NOI >= [target amount] AND
  - No major repair expenses (>500 AED single item)

BAD MONTH triggers:
  - Occupancy < 50%
  - Cancellation loss > 10% of expected revenue
  - Utility spike > 150% of 3-month average
  - Unplanned repairs > 1000 AED
```

---

## 8. Files Created

### Database Files (C:\Users\AbdulGhaniNwilati\Desktop\rental software\database\)
| File | Purpose | Status |
|------|---------|--------|
| 01_extensions_enums.sql | Extensions & enum types | ✅ Executed |
| 02_core_tables.sql | Users, properties, channels, categories | ✅ Executed |
| 03_transaction_tables.sql | Bookings, expenses, calendar, audit | ✅ Executed |
| 04_indexes_views_functions.sql | Indexes, views, helper functions | ✅ Executed |
| 05_seed_data.sql | Channels, categories, test user | ✅ Executed |

### Backend Files (C:\Users\AbdulGhaniNwilati\Desktop\rental software\)
| File | Purpose | Status |
|------|---------|--------|
| .env | Environment variables | ✅ Created |
| requirements.txt | Python dependencies | ✅ Created |
| app/main.py | FastAPI app entry | ✅ Created |
| app/core/config.py | Settings | ✅ Created |
| app/core/database.py | DB connection | ✅ Created |
| app/core/security.py | JWT auth | ✅ Created |
| app/models/models.py | SQLAlchemy models | ✅ Created (with Computed fix) |
| app/schemas/schemas.py | Pydantic schemas | ✅ Created |
| app/api/auth.py | Auth routes | ✅ Created |
| app/api/properties.py | Properties CRUD | ✅ Created |
| app/api/channels.py | Channels CRUD | ✅ Created |
| app/api/categories.py | Categories routes | ✅ Created |
| app/api/bookings.py | Bookings CRUD | ✅ Created |
| app/api/expenses.py | Expenses CRUD | ✅ Created |
| app/api/dashboard.py | Dashboard KPIs | ✅ Created |

### Frontend Files (C:\Users\AbdulGhaniNwilati\Desktop\rental software\frontend\)
| File | Purpose | Status |
|------|---------|--------|
| vite.config.ts | Vite config with proxy | ✅ Created |
| tailwind.config.js | Tailwind config | ✅ Created |
| postcss.config.js | PostCSS config | ✅ Created |
| src/index.css | Tailwind imports | ✅ Updated |
| src/App.tsx | Main app with routes | ✅ Created |
| src/main.tsx | React entry | ✅ Updated |
| src/api/client.ts | Axios API client | ✅ Created |
| src/components/Layout.tsx | Sidebar layout | ✅ Created |
| src/components/KPICard.tsx | KPI display card | ✅ Created |
| src/components/DataTable.tsx | Data table | ✅ Created |
| src/pages/Dashboard.tsx | Dashboard page | ✅ Created |
| src/pages/Bookings.tsx | Bookings page + form | ✅ Created |
| src/pages/Expenses.tsx | Expenses page + form | ✅ Created |
| src/pages/Properties.tsx | Properties page + form | ✅ Created |

---

## 9. Open Questions

✅ ~~Channels~~ — Airbnb, Booking.com + extensible for future
✅ ~~Accounting~~ — Cash basis with payment method tracking
✅ ~~Scope~~ — Multi-property ready, starting with 1
✅ ~~VAT~~ — VAT registered, track on expenses
✅ ~~Tourism fees~~ — Platform-handled, track for records
✅ ~~Fiscal Year~~ — Calendar year (Jan-Dec)
✅ ~~Historical data~~ — Manual entry for testing

**Remaining Questions:**
- Property details (name, bedrooms, location) — will capture during setup
- DTCM license number — will capture during setup

---

## 10. Session Notes

### Session 1 (2025-12-15) - MAJOR MILESTONE ✅
**Database Setup:**
- ✅ Created Neon cloud PostgreSQL database
  - Host: ep-calm-star-aguss7in-pooler.c-2.eu-central-1.aws.neon.tech
  - Database: holiday_pnl
  - User: neondb_owner
- ✅ Ran all 5 SQL scripts (extensions, tables, transactions, indexes/views, seed data)
- ✅ 9 tables created, 7 channels, 61 expense categories loaded

**Backend (FastAPI):**
- ✅ Set up Python virtual environment
- ✅ Installed dependencies (FastAPI, SQLAlchemy, psycopg2, etc.)
- ✅ Created complete API structure:
  - app/core/config.py - Settings
  - app/core/database.py - DB connection
  - app/core/security.py - JWT auth
  - app/models/models.py - SQLAlchemy models
  - app/schemas/schemas.py - Pydantic schemas
  - app/api/*.py - All API routes
- ✅ Fixed computed columns (nights, gross_revenue, net_revenue, total_amount) with SQLAlchemy Computed()
- ✅ Backend running on http://127.0.0.1:8000

**Frontend (React + Vite + Tailwind):**
- ✅ Created React project with Vite
- ✅ Installed dependencies (axios, react-router-dom, recharts, lucide-react, etc.)
- ✅ Set up Tailwind CSS v4 with @tailwindcss/postcss
- ✅ Created components: Layout, KPICard, DataTable
- ✅ Created pages: Dashboard, Bookings, Expenses, Properties
- ✅ Fixed CORS with Vite proxy (vite.config.ts)
- ✅ Frontend running on http://localhost:5173

**Issues Resolved:**
- CORS blocking - Fixed with Vite proxy
- Tailwind v4 PostCSS plugin change - Used @tailwindcss/postcss
- SQLAlchemy computed columns - Added Computed() to model definitions
- Type exports - Moved types inline in components

**Working Features:**
- ✅ Add/Edit/View Properties
- ✅ Add/Edit/View Bookings (with channel, dates, rates, fees)
- ✅ Add/Edit/View Expenses (with categories, VAT)
- ✅ Dashboard with KPI cards
- ✅ Revenue trend chart
- ✅ Channel mix pie chart
- ✅ Expense breakdown

**Next Steps:**
- Add P&L report export
- Add CSV import for bookings/expenses
- Add date filters to dashboard
- Add Settings page

---

## 11. Quick Resume Prompt

If starting a new chat, paste this:

```
I'm building a Holiday Home P&L Management System. Please read the PROJECT_MEMORY.md 
file in /mnt/user-data/uploads/ to see current progress, decisions made, and next steps.
Continue from where we left off.
```

## 12. Startup Commands

### Start Backend (Terminal 1):
```bash
cd "C:\Users\AbdulGhaniNwilati\Desktop\rental software"
venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Start Frontend (Terminal 2):
```bash
cd "C:\Users\AbdulGhaniNwilati\Desktop\rental software\frontend"
npm run dev
```

### Access URLs:
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000
- API Docs: http://127.0.0.1:8000/docs

## 13. Contact & Resources

- Requirements Doc: Original spec document (uploaded in chat 1)
- Reference: UAE DTCM holiday home regulations
- Reference: Airbnb/Booking.com payout structures

