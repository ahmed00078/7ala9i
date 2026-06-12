from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Request, Depends, Form, Query
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.booking import Booking
from app.services.admin_audit import log_action
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, paginate, set_flash

router = APIRouter()
PER_PAGE = 25


@router.get("/clients", response_class=HTMLResponse)
async def list_clients(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    q: str = Query(""),
    status: str = Query("all"),
    page: int = Query(1, ge=1),
):
    query = select(User).where(User.role == UserRole.client)
    if q:
        like = f"%{q}%"
        query = query.where(
            (User.first_name.ilike(like)) | (User.last_name.ilike(like)) | (User.phone.ilike(like))
        )
    if status == "suspended":
        query = query.where(User.is_suspended == True)  # noqa
    elif status == "active":
        query = query.where(User.is_suspended == False)  # noqa
    query = query.order_by(User.created_at.desc()).offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1)
    raw = (await db.execute(query)).scalars().all()

    pg = paginate(page, raw)
    return templates.TemplateResponse(
        "admin/clients/list.html",
        {
            "request": request, "admin": admin, "clients": pg["items"],
            "page": pg["page"], "has_next": pg["has_next"], "has_prev": pg["has_prev"],
            "q": q, "status_filter": status, "active_page": "clients",
        },
    )


@router.get("/clients/{client_id}", response_class=HTMLResponse)
async def client_detail(
    request: Request,
    client_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    client = (await db.execute(select(User).where(User.id == client_id))).scalars().first()
    if not client:
        return Response("Not found", status_code=404)
    bookings = (await db.execute(
        select(Booking).where(Booking.client_id == client_id)
        .order_by(Booking.created_at.desc()).limit(20)
    )).scalars().all()

    return templates.TemplateResponse(
        "admin/clients/detail.html",
        {"request": request, "admin": admin, "client": client,
         "bookings": bookings, "active_page": "clients"},
    )


@router.post("/clients/{client_id}/suspend")
async def suspend_client(
    request: Request,
    client_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    reason: str = Form(""),
):
    user = (await db.execute(select(User).where(User.id == client_id))).scalars().first()
    if not user:
        return Response("Not found", status_code=404)
    user.is_suspended = True
    user.suspended_at = datetime.now(timezone.utc)
    user.suspended_reason = reason or None
    await log_action(db, admin.id, "user.suspend", "user", client_id, reason=reason or None)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshPage"})
    set_flash(request, "Client suspendu.")
    return RedirectResponse(url=f"/admin/clients/{client_id}", status_code=302)


@router.post("/clients/{client_id}/unsuspend")
async def unsuspend_client(
    request: Request,
    client_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == client_id))).scalars().first()
    if not user:
        return Response("Not found", status_code=404)
    user.is_suspended = False
    user.suspended_at = None
    user.suspended_reason = None
    await log_action(db, admin.id, "user.unsuspend", "user", client_id)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshPage"})
    set_flash(request, "Client réactivé.")
    return RedirectResponse(url=f"/admin/clients/{client_id}", status_code=302)
