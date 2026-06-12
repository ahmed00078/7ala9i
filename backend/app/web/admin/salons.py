from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Request, Depends, Form, Query
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.salon import Salon
from app.models.booking import Booking
from app.models.review import Review
from app.models.user import User
from app.services.admin_audit import log_action
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, paginate, set_flash

router = APIRouter()
PER_PAGE = 25


@router.get("/salons", response_class=HTMLResponse)
async def list_salons(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    q: str = Query(""),
    city: str = Query(""),
    status: str = Query("all"),
    page: int = Query(1, ge=1),
):
    query = select(Salon)
    if q:
        like = f"%{q}%"
        query = query.where(Salon.name.ilike(like) | Salon.city.ilike(like))
    if city:
        query = query.where(Salon.city == city)
    if status == "active":
        query = query.where(Salon.is_active == True, Salon.is_suspended == False)  # noqa
    elif status == "suspended":
        query = query.where(Salon.is_suspended == True)  # noqa
    elif status == "inactive":
        query = query.where(Salon.is_active == False)  # noqa
    query = query.order_by(Salon.created_at.desc()).offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1)
    raw = (await db.execute(query)).scalars().all()

    pg = paginate(page, raw)
    return templates.TemplateResponse(
        "admin/salons/list.html",
        {
            "request": request, "admin": admin, "salons": pg["items"],
            "page": pg["page"], "has_next": pg["has_next"], "has_prev": pg["has_prev"],
            "q": q, "city_filter": city, "status_filter": status, "active_page": "salons",
        },
    )


@router.get("/salons/{salon_id}", response_class=HTMLResponse)
async def salon_detail(
    request: Request,
    salon_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    salon = (await db.execute(select(Salon).where(Salon.id == salon_id))).scalars().first()
    if not salon:
        return Response("Not found", status_code=404)
    recent_bookings = (await db.execute(
        select(Booking).where(Booking.salon_id == salon_id)
        .order_by(Booking.created_at.desc()).limit(10)
    )).scalars().all()
    recent_reviews = (await db.execute(
        select(Review).where(Review.salon_id == salon_id)
        .order_by(Review.created_at.desc()).limit(5)
    )).scalars().all()

    return templates.TemplateResponse(
        "admin/salons/detail.html",
        {
            "request": request, "admin": admin, "salon": salon,
            "recent_bookings": recent_bookings, "recent_reviews": recent_reviews,
            "active_page": "salons",
        },
    )


@router.post("/salons/{salon_id}/suspend")
async def suspend_salon(
    request: Request,
    salon_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    reason: str = Form(""),
):
    salon = (await db.execute(select(Salon).where(Salon.id == salon_id))).scalars().first()
    if not salon:
        return Response("Not found", status_code=404)
    salon.is_suspended = True
    salon.suspended_at = datetime.now(timezone.utc)
    salon.suspended_reason = reason or None
    await log_action(db, admin.id, "salon.suspend", "salon", salon_id, reason=reason or None)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshPage"})
    set_flash(request, "Salon suspendu.")
    return RedirectResponse(url=f"/admin/salons/{salon_id}", status_code=302)


@router.post("/salons/{salon_id}/unsuspend")
async def unsuspend_salon(
    request: Request,
    salon_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    salon = (await db.execute(select(Salon).where(Salon.id == salon_id))).scalars().first()
    if not salon:
        return Response("Not found", status_code=404)
    salon.is_suspended = False
    salon.suspended_at = None
    salon.suspended_reason = None
    await log_action(db, admin.id, "salon.unsuspend", "salon", salon_id)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshPage"})
    set_flash(request, "Salon réactivé.")
    return RedirectResponse(url=f"/admin/salons/{salon_id}", status_code=302)
