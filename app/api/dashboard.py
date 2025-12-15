from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, cast, String
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from app.core.database import get_db
from app.models.models import Booking, Expense, Property, Channel, ExpenseCategory
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

    # Get expense stats
    expense_total = db.query(
        func.sum(Expense.total_amount).label('total_expenses')
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

    noi = net_revenue - expense_total
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
