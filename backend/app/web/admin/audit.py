from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, paginate

router = APIRouter()
PER_PAGE = 25


@router.get("/audit", response_class=HTMLResponse)
async def audit_log(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    action: str = Query(""),
    target_type: str = Query(""),
    page: int = Query(1, ge=1),
):
    query = select(AdminAuditLog)
    if action:
        query = query.where(AdminAuditLog.action.ilike(f"%{action}%"))
    if target_type:
        query = query.where(AdminAuditLog.target_type == target_type)
    query = (
        query.order_by(AdminAuditLog.created_at.desc())
        .offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1)
    )
    raw = (await db.execute(query)).scalars().all()

    pg = paginate(page, raw)
    return templates.TemplateResponse(
        "admin/audit/list.html",
        {
            "request": request, "admin": admin,
            "entries": pg["items"],
            "page": pg["page"], "has_next": pg["has_next"], "has_prev": pg["has_prev"],
            "action_filter": action, "target_type_filter": target_type,
            "active_page": "audit",
        },
    )
