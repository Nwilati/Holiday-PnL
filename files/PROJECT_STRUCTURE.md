# Holiday Home P&L System - Project Structure

## Last Updated: January 16, 2026

## Directory Structure

```
Holiday-PnL/
│
├── README.md
├── .gitignore
├── Procfile                    # Railway deployment
├── requirements.txt            # Python dependencies
├── nixpacks.toml              # Build config
│
├── app/                        # FastAPI Backend
│   ├── __init__.py
│   ├── main.py                # FastAPI app entry point
│   │
│   ├── api/                   # API Routes
│   │   ├── __init__.py
│   │   ├── auth.py            # Login, logout, token
│   │   ├── properties.py      # Property CRUD
│   │   ├── channels.py        # Booking channels
│   │   ├── categories.py      # Expense categories
│   │   ├── bookings.py        # Booking management
│   │   ├── expenses.py        # Expense management
│   │   ├── dashboard.py       # Dashboard KPIs
│   │   ├── receipts.py        # Receipt uploads
│   │   ├── tenancies.py       # Long-term rentals
│   │   ├── accounting.py      # Journal entries
│   │   ├── tax_reports.py     # VAT reports
│   │   ├── deposits.py        # Security deposits
│   │   └── offplan.py         # Off-plan properties
│   │
│   ├── core/                  # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py          # Settings
│   │   ├── database.py        # DB session
│   │   └── security.py        # JWT, passwords
│   │
│   ├── models/                # SQLAlchemy Models
│   │   ├── __init__.py
│   │   └── models.py          # All models in one file
│   │
│   └── schemas/               # Pydantic Schemas
│       ├── __init__.py
│       └── schemas.py         # All schemas in one file
│
├── frontend/                   # React Frontend
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx            # Routes & auth
│   │   │
│   │   ├── api/
│   │   │   └── client.ts      # API client & types
│   │   │
│   │   ├── components/
│   │   │   ├── DataTable.tsx
│   │   │   ├── KPICard.tsx
│   │   │   └── Layout.tsx     # Sidebar navigation
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   │
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── Bookings.tsx
│   │       ├── Expenses.tsx
│   │       ├── Properties.tsx
│   │       ├── Calendar.tsx
│   │       ├── Reports.tsx
│   │       ├── Tenancies.tsx
│   │       ├── Accounting.tsx
│   │       ├── TaxReports.tsx
│   │       ├── OffPlan.tsx
│   │       ├── Users.tsx
│   │       └── Login.tsx
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vercel.json
│
└── docs/
    ├── PROJECT_MEMORY.md
    ├── PROJECT_STRUCTURE.md
    └── schema.sql
```

## Tech Stack

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI | Async API, auto OpenAPI docs |
| ORM | SQLAlchemy 2.0 | Database abstraction |
| Validation | Pydantic v2 | Request/response validation |
| Auth | JWT (PyJWT) | Token-based authentication |
| Password | bcrypt | Password hashing |
| DB Driver | psycopg3 | PostgreSQL driver |
| Hosting | Railway | Backend hosting |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI framework |
| Language | TypeScript | Type safety |
| Build | Vite | Fast dev server & builds |
| Styling | Tailwind CSS | Utility-first CSS |
| Charts | Recharts | Data visualization |
| Icons | Lucide React | Icon library |
| HTTP | Axios | API client |
| Export | xlsx | Excel file generation |
| Hosting | Vercel | Frontend hosting |

### Infrastructure
| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15 (Neon) | Primary database |
| Backend | Railway | API hosting |
| Frontend | Vercel | Static hosting |
| Repository | GitHub | Version control |

## Database Models

### Core Models
```
users
├── id (UUID)
├── email
├── password_hash
├── full_name
├── role
└── is_active

properties
├── id (UUID)
├── name
├── property_type
├── address
├── bedrooms/bathrooms
├── dtcm_license
└── vat settings

channels
├── id (UUID)
├── code
├── name
├── commission_rate
└── color_hex

bookings
├── id (UUID)
├── property_id (FK)
├── channel_id (FK)
├── guest_name
├── check_in/check_out
├── nightly_rate
├── gross_revenue
├── net_revenue
└── status (enum)

expenses
├── id (UUID)
├── property_id (FK)
├── category_id (FK)
├── amount
├── vat_amount
├── payment_method (enum)
└── receipt_url
```

### Tenancy Models
```
tenancies
├── id (UUID)
├── property_id (FK)
├── tenant_name
├── start_date/end_date
├── monthly_rent
├── security_deposit
└── status (enum)

tenancy_payments
├── id (UUID)
├── tenancy_id (FK)
├── cheque_number
├── amount
├── due_date
├── status (enum)
└── cleared_date
```

### Off-Plan Models
```
offplan_properties
├── id (UUID)
├── developer
├── project_name
├── unit_number
├── emirate (enum)
├── base_price
├── land_dept_fee
├── admin_fees
├── total_cost
├── purchase_date
├── expected_handover
└── status (enum)

offplan_payments
├── id (UUID)
├── offplan_property_id (FK)
├── installment_number
├── milestone_name
├── percentage
├── amount
├── due_date
├── status (enum)
├── paid_date
└── payment_method

offplan_documents
├── id (UUID)
├── offplan_property_id (FK)
├── document_type
├── document_name
├── file_data (base64)
└── mime_type
```

## API Endpoints

### Authentication
```
POST   /api/v1/auth/login          # Get tokens
GET    /api/v1/auth/me             # Current user
```

### Properties
```
GET    /api/v1/properties          # List all
POST   /api/v1/properties          # Create
GET    /api/v1/properties/{id}     # Get one
PUT    /api/v1/properties/{id}     # Update
DELETE /api/v1/properties/{id}     # Delete
```

### Bookings
```
GET    /api/v1/bookings            # List (filterable)
POST   /api/v1/bookings            # Create
GET    /api/v1/bookings/{id}       # Get one
PUT    /api/v1/bookings/{id}       # Update
DELETE /api/v1/bookings/{id}       # Delete
```

### Expenses
```
GET    /api/v1/expenses            # List (filterable)
POST   /api/v1/expenses            # Create
GET    /api/v1/expenses/{id}       # Get one
PUT    /api/v1/expenses/{id}       # Update
DELETE /api/v1/expenses/{id}       # Delete
```

### Dashboard
```
GET    /api/v1/dashboard/kpis      # Main metrics
GET    /api/v1/dashboard/revenue-trend    # Monthly chart
GET    /api/v1/dashboard/channel-mix      # Pie chart
GET    /api/v1/dashboard/expense-breakdown # By category
```

### Tenancies
```
GET    /api/v1/tenancies                       # List all
POST   /api/v1/tenancies                       # Create
GET    /api/v1/tenancies/{id}                  # Get details
PUT    /api/v1/tenancies/{id}                  # Update
DELETE /api/v1/tenancies/{id}                  # Delete
GET    /api/v1/tenancies/{id}/payments         # List payments
POST   /api/v1/tenancies/{id}/payments         # Add payment
PUT    /api/v1/tenancy-payments/{id}           # Update payment
DELETE /api/v1/tenancy-payments/{id}           # Delete payment
GET    /api/v1/tenancies/dashboard/upcoming    # Upcoming cheques
```

### Off-Plan Properties
```
GET    /api/v1/offplan/properties              # List all
POST   /api/v1/offplan/properties              # Create with payments
GET    /api/v1/offplan/properties/{id}         # Get with details
PUT    /api/v1/offplan/properties/{id}         # Update
DELETE /api/v1/offplan/properties/{id}         # Delete

GET    /api/v1/offplan/properties/{id}/payments    # List payments
POST   /api/v1/offplan/properties/{id}/payments    # Add payment
PUT    /api/v1/offplan/payments/{id}               # Update payment
DELETE /api/v1/offplan/payments/{id}               # Delete payment
POST   /api/v1/offplan/payments/{id}/mark-paid     # Mark as paid

GET    /api/v1/offplan/properties/{id}/documents   # List documents
POST   /api/v1/offplan/properties/{id}/documents   # Upload document
GET    /api/v1/offplan/documents/{id}              # Download document
DELETE /api/v1/offplan/documents/{id}              # Delete document

GET    /api/v1/offplan/dashboard/upcoming-payments # Next 30 days
GET    /api/v1/offplan/dashboard/summary           # Investment overview
```

### Accounting
```
GET    /api/v1/accounting/journal-entries      # List entries
POST   /api/v1/accounting/journal-entries      # Create entry
GET    /api/v1/accounting/accounts             # Chart of accounts
GET    /api/v1/accounting/trial-balance        # Trial balance
```

### Tax Reports
```
GET    /api/v1/tax-reports/vat-summary         # VAT calculations
```

## Frontend Pages

### Navigation Menu
1. Dashboard
2. Calendar
3. Bookings
4. Tenancies
5. **Off-Plan** ← New
6. Expenses
7. Accounting
8. Tax Reports
9. Properties
10. Reports
11. Users

### Off-Plan Page Features
- **Summary Cards**: Total Investment, Total Paid, Remaining, Paid %
- **Properties Table**: Developer, Project, Unit, Emirate, Total Cost, Paid %, Next Payment, Status
- **Expandable Rows**:
  - Cost Breakdown (Base Price, Land Dept Fee, Admin Fees, Total)
  - Payment Schedule (with Mark Paid action)
  - Documents (with Upload/Download)
- **Add Property Modal**: Full form with payment schedule builder
- **Quick Presets**: Standard 60/40, Construction Linked
- **Export**: Payment Schedule PDF, Investment Summary Excel

### Dashboard Widgets
- KPI Cards (Revenue, NOI, Occupancy, etc.)
- Revenue Trend Chart
- Channel Mix Pie Chart
- Expense Breakdown
- **Off-Plan Investment Summary** ← New
- **Upcoming Off-Plan Payments** ← New

## Environment Variables

### Backend (Railway)
```env
DATABASE_URL=postgresql+psycopg://...
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
APP_NAME=Holiday Home PnL
DEBUG=False
```

### Frontend (Vercel)
```env
VITE_API_URL=https://holiday-pnl-production.up.railway.app
```

## Deployment

### Backend (Railway)
1. Connect GitHub repo
2. Set environment variables
3. Deploy from main branch
4. Procfile: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)
1. Connect GitHub repo
2. Set VITE_API_URL
3. Build command: `npm run build`
4. Output directory: `dist`

### Database (Neon)
1. Create project
2. Get connection string
3. Run migrations via SQL Editor