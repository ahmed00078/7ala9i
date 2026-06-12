from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.admin_audit import log_action
from app.services.admin_broadcast import preview_audience, send_broadcast
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, set_flash

router = APIRouter()


@router.get("/broadcasts", response_class=HTMLResponse)
async def compose_broadcast(
    request: Request,
    admin: User = Depends(require_admin_session),
):
    return templates.TemplateResponse(
        "admin/broadcasts/compose.html",
        {"request": request, "admin": admin, "active_page": "broadcasts"},
    )


@router.post("/broadcasts/preview", response_class=HTMLResponse)
async def preview_broadcast_audience(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    role: str = Form(""),
    language: str = Form(""),
):
    result = await preview_audience(db, role=role or None, language=language or None)
    return templates.TemplateResponse(
        "admin/broadcasts/_audience_preview.html",
        {"request": request, "count": result["count"], "samples": result["samples"]},
    )


@router.post("/broadcasts/send")
async def send_broadcast_post(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    title_ar: str = Form(""),
    title_fr: str = Form(""),
    title_en: str = Form(""),
    body_ar: str = Form(""),
    body_fr: str = Form(""),
    body_en: str = Form(""),
    role: str = Form(""),
    language: str = Form(""),
):
    title_by_lang = {k: v for k, v in {"ar": title_ar, "fr": title_fr, "en": title_en}.items() if v}
    body_by_lang = {k: v for k, v in {"ar": body_ar, "fr": body_fr, "en": body_en}.items() if v}

    if not title_by_lang or not body_by_lang:
        return templates.TemplateResponse(
            "admin/broadcasts/compose.html",
            {"request": request, "admin": admin, "active_page": "broadcasts",
             "error": "Au moins un titre et un corps sont requis."},
            status_code=400,
        )

    count = await send_broadcast(
        db,
        admin_id=admin.id,
        title_by_lang=title_by_lang,
        body_by_lang=body_by_lang,
        role=role or None,
        language=language or None,
    )
    await log_action(
        db, admin.id, "broadcast.send",
        extra={"audience_count": count, "filters": {"role": role, "language": language}},
    )
    set_flash(request, f"Broadcast envoyé à {count} utilisateur(s).")
    return RedirectResponse(url="/admin/broadcasts", status_code=302)
