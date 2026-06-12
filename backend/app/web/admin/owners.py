from datetime import time, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Request, Depends, Form, Query
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.booking import Booking
from app.models.working_hours import WorkingHours
from app.utils.security import hash_password
from app.services.notification_service import notify_owner_approved, notify_owner_rejected
from app.services.admin_audit import log_action
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, paginate, set_flash

router = APIRouter()
PER_PAGE = 25


@router.get("/owners", response_class=HTMLResponse)
async def list_owners(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    status: str = Query("all"),
    q: str = Query(""),
    page: int = Query(1, ge=1),
):
    query = select(User).where(User.role == UserRole.owner)
    if status == "pending":
        query = query.where(User.is_approved == False)  # noqa: E712
    elif status == "approved":
        query = query.where(User.is_approved == True)  # noqa: E712
    elif status == "suspended":
        query = query.where(User.is_suspended == True)  # noqa: E712
    if q:
        like = f"%{q}%"
        query = query.where(
            (User.first_name.ilike(like)) | (User.last_name.ilike(like)) | (User.phone.ilike(like))
        )
    query = query.order_by(User.created_at.desc()).offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1)
    raw = (await db.execute(query)).scalars().all()

    pg = paginate(page, raw)
    return templates.TemplateResponse(
        "admin/owners/list.html",
        {
            "request": request, "admin": admin, "owners": pg["items"],
            "page": pg["page"], "has_next": pg["has_next"], "has_prev": pg["has_prev"],
            "status_filter": status, "q": q, "active_page": "owners",
        },
    )


@router.get("/owners/new", response_class=HTMLResponse)
async def new_owner_page(request: Request, admin: User = Depends(require_admin_session)):
    return templates.TemplateResponse(
        "admin/owners/create.html",
        {"request": request, "admin": admin, "active_page": "owners"},
    )


@router.post("/owners/new")
async def create_owner(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    phone: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    password: str = Form(...),
    salon_name: str = Form(...),
    salon_name_ar: str = Form(""),
    address: str = Form(""),
    city: str = Form("Nouakchott"),
    salon_phone: str = Form(""),
):
    existing = (await db.execute(select(User).where(User.phone == phone))).scalars().first()
    if existing:
        return templates.TemplateResponse(
            "admin/owners/create.html",
            {"request": request, "admin": admin, "active_page": "owners",
             "error": "Ce numéro est déjà enregistré."},
            status_code=400,
        )

    owner = User(
        phone=phone,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        role=UserRole.owner,
        is_approved=True,
    )
    db.add(owner)
    await db.flush()

    salon = Salon(
        owner_id=owner.id,
        name=salon_name,
        name_ar=salon_name_ar or None,
        address=address or None,
        city=city or "Nouakchott",
        phone=salon_phone or None,
    )
    db.add(salon)
    await db.flush()

    for day in range(7):
        db.add(WorkingHours(
            salon_id=salon.id, day_of_week=day,
            open_time=time(9, 0), close_time=time(21, 0), is_closed=(day == 4),
        ))

    await log_action(db, admin.id, "owner.create", "user", owner.id)
    set_flash(request, f"Propriétaire {first_name} {last_name} créé avec succès.")
    return RedirectResponse(url="/admin/owners", status_code=302)


@router.get("/owners/{owner_id}", response_class=HTMLResponse)
async def owner_detail(
    request: Request,
    owner_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    owner = (await db.execute(select(User).where(User.id == owner_id))).scalars().first()
    if not owner:
        return Response("Not found", status_code=404)
    salon = (await db.execute(select(Salon).where(Salon.owner_id == owner_id))).scalars().first()
    booking_count = 0
    if salon:
        booking_count = (await db.execute(
            select(func.count(Booking.id)).where(Booking.salon_id == salon.id)
        )).scalar_one()

    is_htmx = request.headers.get("HX-Request")
    template = "admin/owners/detail_partial.html" if is_htmx else "admin/owners/detail.html"
    return templates.TemplateResponse(
        template,
        {"request": request, "admin": admin, "owner": owner,
         "salon": salon, "booking_count": booking_count, "active_page": "owners"},
    )


@router.post("/owners/{owner_id}/approve")
async def approve_owner(
    request: Request,
    owner_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    salon_name: str = Form(...),
    salon_name_ar: str = Form(""),
    address: str = Form(""),
    city: str = Form("Nouakchott"),
    salon_phone: str = Form(""),
):
    owner = (await db.execute(
        select(User).where(User.id == owner_id, User.role == UserRole.owner)
    )).scalars().first()
    if not owner or owner.is_approved:
        return Response("Bad request", status_code=400)

    owner.is_approved = True
    salon = Salon(
        owner_id=owner.id,
        name=salon_name,
        name_ar=salon_name_ar or None,
        address=address or None,
        city=city or "Nouakchott",
        phone=salon_phone or None,
    )
    db.add(salon)
    await db.flush()

    for day in range(7):
        db.add(WorkingHours(
            salon_id=salon.id, day_of_week=day,
            open_time=time(9, 0), close_time=time(21, 0), is_closed=(day == 4),
        ))

    await log_action(db, admin.id, "owner.approve", "user", owner_id)
    try:
        await notify_owner_approved(db, owner.id, salon_name)
    except Exception:
        pass

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshList"})
    set_flash(request, "Propriétaire approuvé.")
    return RedirectResponse(url="/admin/owners", status_code=302)


@router.post("/owners/{owner_id}/reject")
async def reject_owner(
    request: Request,
    owner_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    reason: str = Form(""),
):
    owner = (await db.execute(
        select(User).where(User.id == owner_id, User.role == UserRole.owner)
    )).scalars().first()
    if not owner or owner.is_approved:
        return Response("Bad request", status_code=400)

    try:
        await notify_owner_rejected(db, owner.id)
    except Exception:
        pass
    await log_action(db, admin.id, "owner.reject", "user", owner_id, reason=reason or None)
    await db.delete(owner)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshList"})
    set_flash(request, "Propriétaire rejeté.")
    return RedirectResponse(url="/admin/owners", status_code=302)


@router.post("/owners/{owner_id}/suspend")
async def suspend_owner(
    request: Request,
    owner_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    reason: str = Form(""),
):
    owner = (await db.execute(select(User).where(User.id == owner_id))).scalars().first()
    if not owner:
        return Response("Not found", status_code=404)
    owner.is_suspended = True
    owner.suspended_at = datetime.now(timezone.utc)
    owner.suspended_reason = reason or None
    await log_action(db, admin.id, "user.suspend", "user", owner_id, reason=reason or None)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshList"})
    set_flash(request, "Propriétaire suspendu.")
    return RedirectResponse(url="/admin/owners", status_code=302)


@router.post("/owners/{owner_id}/unsuspend")
async def unsuspend_owner(
    request: Request,
    owner_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
):
    owner = (await db.execute(select(User).where(User.id == owner_id))).scalars().first()
    if not owner:
        return Response("Not found", status_code=404)
    owner.is_suspended = False
    owner.suspended_at = None
    owner.suspended_reason = None
    await log_action(db, admin.id, "user.unsuspend", "user", owner_id)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshList"})
    set_flash(request, "Propriétaire réactivé.")
    return RedirectResponse(url="/admin/owners", status_code=302)
