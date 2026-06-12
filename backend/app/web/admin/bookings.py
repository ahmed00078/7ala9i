from uuid import UUID

from fastapi import APIRouter, Request, Depends, Form, Query
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.salon import Salon
from app.models.user import User
from app.services.admin_audit import log_action
from app.services.notification_service import notify_booking_cancelled_by_owner
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, paginate, set_flash

router = APIRouter()
PER_PAGE = 25


@router.get("/bookings", response_class=HTMLResponse)
async def list_bookings(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    status: str = Query("all"),
    date_from: str = Query(""),
    date_to: str = Query(""),
    salon_q: str = Query(""),
    page: int = Query(1, ge=1),
):
    query = select(Booking)
    if status != "all":
        try:
            query = query.where(Booking.status == BookingStatus(status))
        except ValueError:
            pass
    if date_from:
        from datetime import date
        try:
            query = query.where(Booking.booking_date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        from datetime import date
        try:
            query = query.where(Booking.booking_date <= date.fromisoformat(date_to))
        except ValueError:
            pass
    if salon_q:
        salon_ids = [
            r[0] for r in (await db.execute(
                select(Salon.id).where(Salon.name.ilike(f"%{salon_q}%"))
            ))
        ]
        query = query.where(Booking.salon_id.in_(salon_ids)) if salon_ids else query.where(False)

    query = query.order_by(Booking.created_at.desc()).offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1)
    raw = (await db.execute(query)).scalars().all()

    pg = paginate(page, raw)
    return templates.TemplateResponse(
        "admin/bookings/list.html",
        {
            "request": request, "admin": admin, "bookings": pg["items"],
            "page": pg["page"], "has_next": pg["has_next"], "has_prev": pg["has_prev"],
            "status_filter": status, "date_from": date_from, "date_to": date_to,
            "salon_q": salon_q, "active_page": "bookings",
            "statuses": [s.value for s in BookingStatus],
        },
    )


@router.get("/bookings/{booking_id}", response_class=HTMLResponse)
async def booking_detail(
    request: Request,
    booking_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalars().first()
    if not booking:
        return Response("Not found", status_code=404)

    is_htmx = request.headers.get("HX-Request")
    template = "admin/bookings/detail_partial.html" if is_htmx else "admin/bookings/detail.html"
    return templates.TemplateResponse(
        template,
        {"request": request, "admin": admin, "booking": booking, "active_page": "bookings"},
    )


@router.post("/bookings/{booking_id}/cancel")
async def force_cancel_booking(
    request: Request,
    booking_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    reason: str = Form(""),
):
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalars().first()
    if not booking:
        return Response("Not found", status_code=404)
    if booking.status != BookingStatus.confirmed:
        return Response("Cannot cancel this booking", status_code=400)

    booking.status = BookingStatus.cancelled
    await log_action(db, admin.id, "booking.force_cancel", "booking", booking_id, reason=reason or None)

    try:
        await notify_booking_cancelled_by_owner(
            db,
            client_id=booking.client_id,
            salon_name=booking.salon.name,
            booking_date=booking.booking_date,
            start_time=booking.start_time,
            booking_id=booking.id,
        )
    except Exception:
        pass

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshList"})
    set_flash(request, "Réservation annulée.")
    return RedirectResponse(url="/admin/bookings", status_code=302)
