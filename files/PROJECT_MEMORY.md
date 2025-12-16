# Holiday Home P&L System - Project Memory

## Last Updated: December 16, 2025

---

## PROJECT STATUS: ✅ MVP DEPLOYED TO PRODUCTION

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
- **Hosting:** Vercel

---

## DATABASE SCHEMA

### Tables
1. **properties** - Holiday home properties
2. **channels** - Booking channels (Airbnb, Booking.com, etc.)
3. **bookings** - Guest reservations with revenue calculations
4. **expenses** - Property expenses with categories
5. **expense_categories** - Expense categorization
6. **users** - User authentication (not yet implemented in UI)
7. **calendar_blocks** - Blocked dates
8. **attachments** - File attachments
9. **audit_log** - Change tracking

### Custom PostgreSQL Enum Types
- `booking_status`: pending, confirmed, checked_in, completed, cancelled, no_show
- `payment_method`: cash, bank_transfer, credit_card, cheque, other

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

# For payment_method
sql = text("""
    INSERT INTO expenses (..., payment_method, ...) 
    VALUES (..., CAST(:payment_method AS payment_method), ...)
""")
```

**Affected files:**
- `app/api/bookings.py` - Uses raw SQL for create/update
- `app/api/expenses.py` - Uses raw SQL for create/update
- `app/api/dashboard.py` - Uses `cast(Booking.status, String)` for queries

### Database URL Format
psycopg3 requires different URL format:
```python
# Convert in database.py
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://")
```

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to Vercel domain in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
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

## FEATURES COMPLETED (Phase 1 MVP)

### Dashboard ✅
- [x] KPIs: Total Revenue, Net Revenue, Expenses, NOI, Occupancy, ADR, RevPAR
- [x] Revenue trend chart (monthly)
- [x] Channel mix pie chart
- [x] Expense breakdown chart
- [x] Property selector

### Bookings Management ✅
- [x] List all bookings with filters
- [x] Create new booking
- [x] Edit booking
- [x] Delete booking
- [x] Auto-calculate nights, gross revenue, net revenue
- [x] Channel commission calculation

### Expenses Management ✅
- [x] List expenses with filters
- [x] Create expense with category
- [x] Edit expense
- [x] Delete expense
- [x] VAT calculation
- [x] Payment tracking

### Properties ✅
- [x] Property listing
- [x] Property details
- [x] Property selector across all views

### Channels ✅
- [x] Pre-seeded channels (Airbnb, Booking.com, VRBO, etc.)
- [x] Commission rates per channel

### Categories ✅
- [x] Pre-seeded expense categories
- [x] Operating vs non-operating classification

---

## PENDING FEATURES (Phase 2+)

### High Priority
- [ ] User authentication (login/logout)
- [ ] Multi-property support (add new properties)
- [ ] Date range picker on dashboard
- [ ] Export to Excel/PDF
- [ ] Receipt upload for expenses

### Medium Priority
- [ ] Booking calendar view
- [ ] Recurring expenses
- [ ] Budget vs actual comparison
- [ ] Year-over-year comparison
- [ ] Guest management

### Low Priority
- [ ] iCal sync with OTAs
- [ ] Email notifications
- [ ] Mobile responsive improvements
- [ ] Dark mode
- [ ] Multi-currency support

---

## TECHNICAL DEBT

1. **CORS:** Currently allows all origins - should restrict to Vercel domain
2. **Bundle Size:** Frontend chunks exceed 500KB - needs code splitting
3. **Error Handling:** Add proper error boundaries and logging
4. **Testing:** No unit/integration tests yet
5. **API Validation:** Add more input validation
6. **Rate Limiting:** No rate limiting on API

---

## FILE STRUCTURE

```
Holiday-PnL/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── bookings.py      # Raw SQL for enum handling
│   │   ├── categories.py
│   │   ├── channels.py
│   │   ├── dashboard.py     # Cast for enum queries
│   │   ├── expenses.py      # Raw SQL for enum handling
│   │   └── properties.py
│   ├── core/
│   │   ├── config.py        # Uses os.environ directly
│   │   ├── database.py      # psycopg3 URL conversion
│   │   └── security.py
│   ├── models/
│   │   └── models.py        # SQLAlchemy models with PgEnum
│   └── schemas/
│       └── schemas.py       # Pydantic schemas
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts    # API_BASE_URL = Railway URL
│   │   ├── components/
│   │   └── pages/
│   ├── vercel.json
│   └── package.json
├── Procfile                  # web: uvicorn app.main:app
├── nixpacks.toml            # Python 3.11 config
├── requirements.txt         # psycopg[binary]==3.2.3
└── main.py
```

---

## SAMPLE DATA

### Property
- ID: `539a2d8d-f3fb-447b-ba37-b797767a3f74`
- Name: Shoreline 106
- Location: Dubai, UAE

### Channels (Pre-seeded)
- Airbnb (3% commission)
- Booking.com (15% commission)
- VRBO (5% commission)
- Expedia (15% commission)
- Agoda (15% commission)
- Direct Booking (0% commission)

---

## TROUBLESHOOTING

### "CORS Error" in browser
1. Check if Railway is running
2. Verify main.py has CORS middleware
3. Check Railway logs for actual error (often database issue)

### "500 Internal Server Error"
1. Check Railway logs for stack trace
2. Common cause: enum type mismatch
3. Ensure raw SQL with CAST() for enum columns

### "psycopg2 import error"
1. Ensure using `psycopg[binary]` not `psycopg2-binary`
2. Check database URL uses `postgresql+psycopg://`

---

## NEXT DEVELOPMENT PHASE

Ready to proceed with Phase 2 features. Recommended priority:
1. **User Authentication** - Secure the application
2. **Add New Property** - Enable multi-property management
3. **Date Range Picker** - Better dashboard filtering
4. **Export Reports** - Excel/PDF generation
