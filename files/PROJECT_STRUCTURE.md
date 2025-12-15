# Holiday Home P&L System - Project Structure

## Directory Structure

```
holiday-home-pnl/
│
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Settings and configuration
│   │   │
│   │   ├── api/               # API Routes
│   │   │   ├── __init__.py
│   │   │   ├── deps.py        # Dependencies (auth, db session)
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py  # Main router aggregating all routes
│   │   │   │   ├── auth.py    # Login, logout, token refresh
│   │   │   │   ├── properties.py
│   │   │   │   ├── bookings.py
│   │   │   │   ├── expenses.py
│   │   │   │   ├── categories.py
│   │   │   │   ├── channels.py
│   │   │   │   ├── calendar.py
│   │   │   │   ├── reports.py
│   │   │   │   └── dashboard.py
│   │   │
│   │   ├── core/              # Core functionality
│   │   │   ├── __init__.py
│   │   │   ├── security.py    # JWT, password hashing
│   │   │   └── exceptions.py  # Custom exceptions
│   │   │
│   │   ├── db/                # Database
│   │   │   ├── __init__.py
│   │   │   ├── session.py     # DB session management
│   │   │   └── base.py        # SQLAlchemy base
│   │   │
│   │   ├── models/            # SQLAlchemy Models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── property.py
│   │   │   ├── booking.py
│   │   │   ├── expense.py
│   │   │   ├── category.py
│   │   │   ├── channel.py
│   │   │   ├── calendar_block.py
│   │   │   ├── attachment.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── schemas/           # Pydantic Schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── property.py
│   │   │   ├── booking.py
│   │   │   ├── expense.py
│   │   │   ├── category.py
│   │   │   ├── channel.py
│   │   │   ├── calendar.py
│   │   │   ├── dashboard.py
│   │   │   └── reports.py
│   │   │
│   │   ├── services/          # Business Logic
│   │   │   ├── __init__.py
│   │   │   ├── booking_service.py
│   │   │   ├── expense_service.py
│   │   │   ├── report_service.py
│   │   │   ├── dashboard_service.py
│   │   │   └── import_service.py   # CSV import logic
│   │   │
│   │   └── utils/             # Utilities
│   │       ├── __init__.py
│   │       ├── dates.py       # Date helpers
│   │       ├── currency.py    # Currency formatting
│   │       └── storage.py     # File upload helpers
│   │
│   ├── alembic/               # Database migrations
│   │   ├── env.py
│   │   ├── versions/
│   │   └── alembic.ini
│   │
│   ├── tests/                 # Backend tests
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_bookings.py
│   │   ├── test_expenses.py
│   │   └── test_reports.py
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/                   # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── api/               # API client
│   │   │   ├── client.ts      # Axios instance
│   │   │   ├── auth.ts
│   │   │   ├── properties.ts
│   │   │   ├── bookings.ts
│   │   │   ├── expenses.ts
│   │   │   └── reports.ts
│   │   │
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/            # Base UI (buttons, inputs, cards)
│   │   │   ├── layout/        # Layout components
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── charts/        # Chart components
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── OccupancyHeatmap.tsx
│   │   │   │   ├── ChannelMix.tsx
│   │   │   │   └── ExpenseBreakdown.tsx
│   │   │   ├── forms/         # Form components
│   │   │   │   ├── BookingForm.tsx
│   │   │   │   ├── ExpenseForm.tsx
│   │   │   │   └── PropertyForm.tsx
│   │   │   └── tables/        # Data tables
│   │   │       ├── BookingsTable.tsx
│   │   │       └── ExpensesTable.tsx
│   │   │
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Bookings.tsx
│   │   │   ├── BookingDetail.tsx
│   │   │   ├── Expenses.tsx
│   │   │   ├── ExpenseDetail.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Login.tsx
│   │   │   └── NotFound.tsx
│   │   │
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useBookings.ts
│   │   │   ├── useExpenses.ts
│   │   │   └── useDashboard.ts
│   │   │
│   │   ├── store/             # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   ├── propertyStore.ts
│   │   │   └── uiStore.ts
│   │   │
│   │   ├── types/             # TypeScript types
│   │   │   ├── booking.ts
│   │   │   ├── expense.ts
│   │   │   ├── property.ts
│   │   │   └── dashboard.ts
│   │   │
│   │   ├── utils/             # Utilities
│   │   │   ├── dates.ts
│   │   │   ├── currency.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── styles/            # Global styles
│   │       └── globals.css
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── database/                   # Database files
│   ├── schema.sql             # Main schema
│   ├── seed.sql               # Sample data
│   └── migrations/            # Manual migration scripts
│
└── docs/                      # Documentation
    ├── API.md                 # API documentation
    ├── DEPLOYMENT.md          # Deployment guide
    └── USER_GUIDE.md          # User manual
```

## Tech Stack Details

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI | Async API, auto OpenAPI docs |
| ORM | SQLAlchemy 2.0 | Database abstraction |
| Validation | Pydantic v2 | Request/response validation |
| Auth | JWT (python-jose) | Token-based authentication |
| Password | passlib[bcrypt] | Password hashing |
| DB Driver | asyncpg | Async PostgreSQL driver |
| Migrations | Alembic | Schema migrations |
| Testing | pytest + httpx | API testing |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI framework |
| Language | TypeScript | Type safety |
| Build | Vite | Fast dev server & builds |
| Styling | Tailwind CSS | Utility-first CSS |
| State | Zustand | Lightweight state management |
| Data Fetching | TanStack Query | Server state management |
| Charts | Recharts | Data visualization |
| Tables | TanStack Table | Powerful data tables |
| Forms | React Hook Form + Zod | Form handling & validation |
| Icons | Lucide React | Icon library |
| HTTP | Axios | API client |
| Dates | date-fns | Date manipulation |

### Infrastructure
| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15 | Primary database |
| File Storage | S3-compatible | Receipt storage |
| Hosting | Render / Railway / Fly.io | App hosting |
| Container | Docker | Containerization |

## API Endpoints Overview

### Authentication
```
POST   /api/v1/auth/login          # Login, get tokens
POST   /api/v1/auth/logout         # Logout
POST   /api/v1/auth/refresh        # Refresh token
GET    /api/v1/auth/me             # Current user
```

### Properties
```
GET    /api/v1/properties          # List all properties
POST   /api/v1/properties          # Create property
GET    /api/v1/properties/{id}     # Get property
PUT    /api/v1/properties/{id}     # Update property
DELETE /api/v1/properties/{id}     # Delete property
```

### Bookings
```
GET    /api/v1/bookings            # List bookings (filterable)
POST   /api/v1/bookings            # Create booking
GET    /api/v1/bookings/{id}       # Get booking
PUT    /api/v1/bookings/{id}       # Update booking
DELETE /api/v1/bookings/{id}       # Delete booking
POST   /api/v1/bookings/import     # CSV import
POST   /api/v1/bookings/{id}/lock  # Lock completed booking
```

### Expenses
```
GET    /api/v1/expenses            # List expenses (filterable)
POST   /api/v1/expenses            # Create expense
GET    /api/v1/expenses/{id}       # Get expense
PUT    /api/v1/expenses/{id}       # Update expense
DELETE /api/v1/expenses/{id}       # Delete expense
POST   /api/v1/expenses/import     # CSV import
POST   /api/v1/expenses/{id}/receipt  # Upload receipt
```

### Categories
```
GET    /api/v1/categories          # List all categories
GET    /api/v1/categories/tree     # Hierarchical tree
POST   /api/v1/categories          # Create custom category
PUT    /api/v1/categories/{id}     # Update category
```

### Channels
```
GET    /api/v1/channels            # List channels
POST   /api/v1/channels            # Create channel
PUT    /api/v1/channels/{id}       # Update channel
```

### Calendar
```
GET    /api/v1/calendar            # Get calendar view
POST   /api/v1/calendar/blocks     # Create block
PUT    /api/v1/calendar/blocks/{id}  # Update block
DELETE /api/v1/calendar/blocks/{id}  # Delete block
GET    /api/v1/calendar/availability # Check availability
```

### Dashboard
```
GET    /api/v1/dashboard/summary   # Main KPIs
GET    /api/v1/dashboard/revenue   # Revenue trend
GET    /api/v1/dashboard/occupancy # Occupancy data
GET    /api/v1/dashboard/channels  # Channel mix
GET    /api/v1/dashboard/expenses  # Expense breakdown
GET    /api/v1/dashboard/forecast  # Forward-looking
```

### Reports
```
GET    /api/v1/reports/pnl         # P&L statement
GET    /api/v1/reports/bookings    # Booking ledger export
GET    /api/v1/reports/expenses    # Expense ledger export
GET    /api/v1/reports/owner-statement  # Owner statement
GET    /api/v1/reports/tax-summary # Tax pack
```

## Environment Variables

```env
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/holiday_pnl
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Storage (S3-compatible)
STORAGE_BUCKET=holiday-pnl-receipts
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key

# Frontend
VITE_API_URL=http://localhost:8000/api/v1

# General
ENVIRONMENT=development
```

## MVP Feature Priority

### Phase 1 - Core (Weeks 1-2)
1. ✅ Database schema
2. [ ] Backend project setup
3. [ ] User authentication
4. [ ] Property CRUD
5. [ ] Booking CRUD + list
6. [ ] Expense CRUD + list
7. [ ] Basic dashboard (revenue, occupancy, ADR)
8. [ ] Simple P&L report

### Phase 2 - Polish (Weeks 3-4)
1. [ ] CSV import for bookings
2. [ ] CSV import for expenses
3. [ ] Receipt upload
4. [ ] Calendar view
5. [ ] Channel performance chart
6. [ ] Expense breakdown chart
7. [ ] Export to Excel

### Phase 3 - Advanced (Weeks 5-6)
1. [ ] Good/bad month scoring
2. [ ] Occupancy heatmap
3. [ ] Forecasting
4. [ ] Reconciliation
5. [ ] Mobile responsiveness
6. [ ] Notifications
