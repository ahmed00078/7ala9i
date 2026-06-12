from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.admin_audit_log import AdminAuditLog
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates

router = APIRouter()


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    stats = await _get_stats(db)
    alerts = await _get_alerts(db)
    recent_audit = (await db.execute(
        select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(10)
    )).scalars().all()

    return templates.TemplateResponse(
        "admin/dashboard.html",
        {
            "request": request, "admin": admin, "stats": stats,
            "alerts": alerts, "recent_audit": recent_audit, "active_page": "dashboard",
        },
    )


async def _get_stats(db: AsyncSession) -> dict:
    total_clients = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.client)
    )).scalar_one()
    total_owners = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.owner)
    )).scalar_one()
    pending_owners = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.owner, User.is_approved == False)  # noqa
    )).scalar_one()
    total_salons = (await db.execute(select(func.count(Salon.id)))).scalar_one()
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar_one()
    confirmed = (await db.execute(
        select(func.count(Booking.id)).where(Booking.status == BookingStatus.confirmed)
    )).scalar_one()
    return {
        "total_clients": total_clients,
        "total_owners": total_owners,
        "pending_owners": pending_owners,
        "total_salons": total_salons,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed,
    }


async def _get_alerts(db: AsyncSession) -> dict:
    from datetime import datetime, timezone, timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    pending_owners = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.owner, User.is_approved == False)  # noqa
    )).scalar_one()
    low_reviews = (await db.execute(
        select(func.count(Review.id)).where(Review.rating <= 2, Review.created_at >= week_ago)
    )).scalar_one()
    no_show_count = (await db.execute(
        select(func.count(Booking.id)).where(
            Booking.status == BookingStatus.no_show, Booking.created_at >= week_ago,
        )
    )).scalar_one()
    total_this_week = (await db.execute(
        select(func.count(Booking.id)).where(Booking.created_at >= week_ago)
    )).scalar_one()
    no_show_rate = round(no_show_count / total_this_week * 100, 1) if total_this_week else 0

    return {
        "pending_owners": pending_owners,
        "low_reviews_7d": low_reviews,
        "no_show_rate_7d": no_show_rate,
        "no_show_count_7d": no_show_count,
    }
