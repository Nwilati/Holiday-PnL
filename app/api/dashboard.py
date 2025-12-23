from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, cast, String, text
from typing import Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.models.models import Booking, Expense, Property, Channel, ExpenseCategory, Tenancy, TenancyCheque
from app.schemas.schemas import DashboardKPIs, MonthlyRevenue, ChannelPerformance, ExpenseBreakdown

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/kpis", response_model=DashboardKPIs)
def get_kpis(
    property_id: UUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    # Validate property
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")

    # Get booking stats
    booking_stats = db.query(
        func.count(Booking.id).label('total_bookings'),
        func.sum(Booking.nights).label('total_nights'),
        func.sum(Booking.gross_revenue).label('gross_revenue'),
        func.sum(Booking.net_revenue).label('net_revenue'),
        func.avg(Booking.nightly_rate).label('adr')
    ).filter(
        Booking.property_id == property_id,
        Booking.check_in >= start_date,
        Booking.check_in <= end_date,
        cast(Booking.status, String).notin_(['cancelled', 'no_show'])
    ).first()

    # Get expense stats - all expenses for display
    expense_total = db.query(
        func.sum(Expense.total_amount).label('total_expenses')
    ).filter(
        Expense.property_id == property_id,
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date
    ).scalar() or Decimal('0')

    # Get operating expenses only for NOI calculation
    operating_expense_total = db.query(
        func.sum(Expense.total_amount).label('operating_expenses')
    ).join(ExpenseCategory).filter(
        Expense.property_id == property_id,
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date,
        ExpenseCategory.category_type == 'operating_expense'
    ).scalar() or Decimal('0')

    # Calculate metrics
    total_days = (end_date - start_date).days + 1
    gross_revenue = booking_stats.gross_revenue or Decimal('0')
    net_revenue = booking_stats.net_revenue or Decimal('0')
    total_nights = booking_stats.total_nights or 0
    total_bookings = booking_stats.total_bookings or 0
    adr = booking_stats.adr or Decimal('0')

    noi = net_revenue - operating_expense_total
    occupancy_rate = Decimal(total_nights / total_days * 100) if total_days > 0 else Decimal('0')
    revpar = net_revenue / total_days if total_days > 0 else Decimal('0')
    expense_ratio = (expense_total / net_revenue * 100) if net_revenue > 0 else Decimal('0')

    return DashboardKPIs(
        total_revenue=gross_revenue,
        net_revenue=net_revenue,
        total_expenses=expense_total,
        noi=noi,
        occupancy_rate=round(occupancy_rate, 2),
        adr=round(adr, 2),
        revpar=round(revpar, 2),
        total_bookings=total_bookings,
        total_nights=total_nights,
        expense_ratio=round(expense_ratio, 2)
    )

@router.get("/revenue-trend")
def get_revenue_trend(
    property_id: UUID,
    year: int,
    db: Session = Depends(get_db)
):
    results = db.query(
        extract('month', Booking.check_in).label('month'),
        func.sum(Booking.gross_revenue).label('gross_revenue'),
        func.sum(Booking.net_revenue).label('net_revenue')
    ).filter(
        Booking.property_id == property_id,
        extract('year', Booking.check_in) == year,
        cast(Booking.status, String).notin_(['cancelled', 'no_show'])
    ).group_by(
        extract('month', Booking.check_in)
    ).order_by(
        extract('month', Booking.check_in)
    ).all()

    # Get expenses by month
    expense_results = db.query(
        extract('month', Expense.expense_date).label('month'),
        func.sum(Expense.total_amount).label('expenses')
    ).join(ExpenseCategory).filter(
        Expense.property_id == property_id,
        extract('year', Expense.expense_date) == year,
        ExpenseCategory.category_type == 'operating_expense'
    ).group_by(
        extract('month', Expense.expense_date)
    ).all()

    expense_by_month = {int(r.month): r.expenses or 0 for r in expense_results}

    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    trend = []
    for r in results:
        month_num = int(r.month)
        expenses = expense_by_month.get(month_num, 0)
        net = r.net_revenue or 0
        trend.append({
            'month': months[month_num - 1],
            'gross_revenue': float(r.gross_revenue or 0),
            'net_revenue': float(net),
            'expenses': float(expenses),
            'noi': float(net - expenses)
        })

    return trend

@router.get("/channel-mix")
def get_channel_mix(
    property_id: UUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    results = db.query(
        Channel.name,
        Channel.color_hex,
        func.count(Booking.id).label('bookings'),
        func.sum(Booking.nights).label('nights'),
        func.sum(Booking.net_revenue).label('revenue')
    ).join(Booking).filter(
        Booking.property_id == property_id,
        Booking.check_in >= start_date,
        Booking.check_in <= end_date,
        cast(Booking.status, String).notin_(['cancelled', 'no_show'])
    ).group_by(
        Channel.id, Channel.name, Channel.color_hex
    ).all()

    total_revenue = sum(r.revenue or 0 for r in results)

    return [
        {
            'channel_name': r.name,
            'channel_color': r.color_hex,
            'bookings': r.bookings or 0,
            'nights': r.nights or 0,
            'revenue': float(r.revenue or 0),
            'percentage': round(float((r.revenue or 0) / total_revenue * 100), 2) if total_revenue > 0 else 0
        }
        for r in results
    ]

@router.get("/expense-breakdown")
def get_expense_breakdown(
    property_id: UUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    results = db.query(
        ExpenseCategory.name,
        func.sum(Expense.total_amount).label('amount')
    ).join(Expense).filter(
        Expense.property_id == property_id,
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date
    ).group_by(
        ExpenseCategory.id, ExpenseCategory.name
    ).order_by(
        func.sum(Expense.total_amount).desc()
    ).all()

    total = sum(r.amount or 0 for r in results)

    return [
        {
            'category_name': r.name,
            'amount': float(r.amount or 0),
            'percentage': round(float((r.amount or 0) / total * 100), 2) if total > 0 else 0
        }
        for r in results
    ]


# ============================================================================
# NEW ENDPOINTS FOR ENHANCED DASHBOARD
# ============================================================================

@router.get("/alerts")
def get_alerts(
    property_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Get dashboard alerts: overdue cheques, expiring contracts, pending DTCM"""
    today = date.today()
    alerts = []

    # 1. Overdue cheques (past due date, still pending)
    overdue_query = db.query(
        func.count(TenancyCheque.id).label('count'),
        func.sum(TenancyCheque.amount).label('amount')
    ).join(Tenancy).filter(
        TenancyCheque.status == 'pending',
        TenancyCheque.due_date < today,
        Tenancy.status == 'active'
    )
    if property_id:
        overdue_query = overdue_query.filter(Tenancy.property_id == property_id)
    overdue = overdue_query.first()

    if overdue.count and overdue.count > 0:
        alerts.append({
            'type': 'danger',
            'icon': 'alert-circle',
            'title': f'{overdue.count} cheques overdue',
            'subtitle': f'AED {float(overdue.amount or 0):,.0f} outstanding',
            'link': '/tenancies'
        })

    # 2. Contracts expiring in 30 days
    expiry_date = today + timedelta(days=30)
    expiring_query = db.query(func.count(Tenancy.id)).filter(
        Tenancy.status == 'active',
        Tenancy.contract_end <= expiry_date,
        Tenancy.contract_end >= today
    )
    if property_id:
        expiring_query = expiring_query.filter(Tenancy.property_id == property_id)
    expiring_count = expiring_query.scalar() or 0

    if expiring_count > 0:
        alerts.append({
            'type': 'warning',
            'icon': 'calendar',
            'title': f'{expiring_count} contract{"s" if expiring_count > 1 else ""} expiring',
            'subtitle': 'Within next 30 days',
            'link': '/tenancies'
        })

    # 3. Cheques due this week
    week_end = today + timedelta(days=7)
    due_soon_query = db.query(
        func.count(TenancyCheque.id).label('count'),
        func.sum(TenancyCheque.amount).label('amount')
    ).join(Tenancy).filter(
        TenancyCheque.status == 'pending',
        TenancyCheque.due_date >= today,
        TenancyCheque.due_date <= week_end,
        Tenancy.status == 'active'
    )
    if property_id:
        due_soon_query = due_soon_query.filter(Tenancy.property_id == property_id)
    due_soon = due_soon_query.first()

    if due_soon.count and due_soon.count > 0:
        alerts.append({
            'type': 'info',
            'icon': 'clock',
            'title': f'{due_soon.count} cheques due this week',
            'subtitle': f'AED {float(due_soon.amount or 0):,.0f} to collect',
            'link': '/tenancies'
        })

    # 4. Pending DTCM payments (if table exists)
    try:
        current_month = today.month
        current_year = today.year
        dtcm_query = db.execute(text("""
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
            FROM (
                SELECT DISTINCT p.id,
                    COALESCE((SELECT SUM(dp.amount) FROM dtcm_payments dp
                              WHERE dp.property_id = p.id
                              AND dp.period_year = :year
                              AND dp.period_month < :month), 0) as paid
                FROM properties p
                WHERE p.rental_mode = 'short_term' AND p.is_active = true
            ) sub
            WHERE paid = 0
        """), {'year': current_year, 'month': current_month})
        dtcm_result = dtcm_query.fetchone()
        if dtcm_result and dtcm_result.count > 0:
            alerts.append({
                'type': 'warning',
                'icon': 'file-text',
                'title': f'{dtcm_result.count} pending DTCM payments',
                'subtitle': 'Tourism dirham not remitted',
                'link': '/tax-reports'
            })
    except:
        pass  # DTCM table might not exist

    return {'alerts': alerts}


@router.get("/yoy-comparison")
def get_yoy_comparison(
    property_id: Optional[UUID] = None,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Get year-over-year comparison for KPIs"""
    if year is None:
        year = date.today().year

    last_year = year - 1

    def get_yearly_stats(target_year: int):
        start = date(target_year, 1, 1)
        end = date(target_year, 12, 31)

        # Revenue query
        revenue_query = db.query(
            func.sum(Booking.gross_revenue).label('revenue'),
            func.sum(Booking.net_revenue).label('net_revenue'),
            func.count(Booking.id).label('bookings'),
            func.sum(Booking.nights).label('nights')
        ).filter(
            Booking.check_in >= start,
            Booking.check_in <= end,
            cast(Booking.status, String).notin_(['cancelled', 'no_show'])
        )
        if property_id:
            revenue_query = revenue_query.filter(Booking.property_id == property_id)
        revenue = revenue_query.first()

        # Expenses query
        expense_query = db.query(
            func.sum(Expense.total_amount).label('expenses')
        ).filter(
            Expense.expense_date >= start,
            Expense.expense_date <= end
        )
        if property_id:
            expense_query = expense_query.filter(Expense.property_id == property_id)
        expenses = expense_query.scalar() or 0

        return {
            'revenue': float(revenue.revenue or 0),
            'net_revenue': float(revenue.net_revenue or 0),
            'expenses': float(expenses),
            'bookings': revenue.bookings or 0,
            'nights': revenue.nights or 0
        }

    current = get_yearly_stats(year)
    previous = get_yearly_stats(last_year)

    def calc_change(curr, prev):
        if prev == 0:
            return 100 if curr > 0 else 0
        return round((curr - prev) / prev * 100, 1)

    return {
        'current_year': year,
        'previous_year': last_year,
        'current': current,
        'previous': previous,
        'changes': {
            'revenue': calc_change(current['revenue'], previous['revenue']),
            'net_revenue': calc_change(current['net_revenue'], previous['net_revenue']),
            'expenses': calc_change(current['expenses'], previous['expenses']),
            'bookings': calc_change(current['bookings'], previous['bookings']),
            'nights': calc_change(current['nights'], previous['nights']),
            'noi': calc_change(
                current['net_revenue'] - current['expenses'],
                previous['net_revenue'] - previous['expenses']
            )
        }
    }


@router.get("/revenue-trend-all")
def get_revenue_trend_all(
    year: int,
    db: Session = Depends(get_db)
):
    """Get monthly revenue trend for all properties combined"""
    results = db.query(
        extract('month', Booking.check_in).label('month'),
        func.sum(Booking.gross_revenue).label('gross_revenue'),
        func.sum(Booking.net_revenue).label('net_revenue')
    ).filter(
        extract('year', Booking.check_in) == year,
        cast(Booking.status, String).notin_(['cancelled', 'no_show'])
    ).group_by(
        extract('month', Booking.check_in)
    ).order_by(
        extract('month', Booking.check_in)
    ).all()

    # Get expenses by month
    expense_results = db.query(
        extract('month', Expense.expense_date).label('month'),
        func.sum(Expense.total_amount).label('expenses')
    ).join(ExpenseCategory).filter(
        extract('year', Expense.expense_date) == year,
        ExpenseCategory.category_type == 'operating_expense'
    ).group_by(
        extract('month', Expense.expense_date)
    ).all()

    expense_by_month = {int(r.month): float(r.expenses or 0) for r in expense_results}
    revenue_by_month = {int(r.month): {
        'gross': float(r.gross_revenue or 0),
        'net': float(r.net_revenue or 0)
    } for r in results}

    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    trend = []
    for i in range(1, 13):
        rev = revenue_by_month.get(i, {'gross': 0, 'net': 0})
        exp = expense_by_month.get(i, 0)
        trend.append({
            'month': months[i - 1],
            'revenue': rev['net'],
            'expenses': exp,
            'noi': rev['net'] - exp
        })

    return trend


@router.get("/expense-breakdown-all")
def get_expense_breakdown_all(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    """Get expense breakdown by category for all properties"""
    results = db.query(
        ExpenseCategory.name,
        func.sum(Expense.total_amount).label('amount')
    ).join(Expense).filter(
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date
    ).group_by(
        ExpenseCategory.id, ExpenseCategory.name
    ).order_by(
        func.sum(Expense.total_amount).desc()
    ).all()

    total = sum(float(r.amount or 0) for r in results)

    # Define colors for categories (SAP Fiori palette)
    colors = ['#0854a0', '#d08014', '#107e3e', '#a9d18e', '#bb0000', '#6c6c6c', '#ab218e', '#008b8b']

    return [
        {
            'name': r.name,
            'value': float(r.amount or 0),
            'percentage': round(float((r.amount or 0) / total * 100), 1) if total > 0 else 0,
            'color': colors[i % len(colors)]
        }
        for i, r in enumerate(results)
    ]
