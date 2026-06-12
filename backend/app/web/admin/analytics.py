import json

from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.admin_analytics import (
    bookings_per_day,
    revenue_per_month,
    top_salons,
    signups_per_week,
    booking_status_distribution,
)
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates

router = APIRouter()


@router.get("/analytics", response_class=HTMLResponse)
async def analytics_page(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    range: str = Query("30d"),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map.get(range, 30)

    bpd = await bookings_per_day(db, days=days)
    rpm = await revenue_per_month(db, months=3 if days <= 30 else 6)
    ts = await top_salons(db)
    spw = await signups_per_week(db, weeks=max(4, days // 7))
    bsd = await booking_status_distribution(db)

    return templates.TemplateResponse(
        "admin/analytics/index.html",
        {
            "request": request, "admin": admin, "active_page": "analytics",
            "range": range,
            "bookings_per_day_json": json.dumps(bpd),
            "revenue_per_month_json": json.dumps(rpm),
            "top_salons": ts,
            "signups_per_week_json": json.dumps(spw),
            "booking_status_json": json.dumps(bsd),
        },
    )
