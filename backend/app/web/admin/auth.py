from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import verify_password, create_session_token, create_csrf_token
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates

router = APIRouter()


@router.get("/", include_in_schema=False)
async def admin_root():
    return RedirectResponse(url="/admin/dashboard", status_code=302)


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    if request.cookies.get("admin_session"):
        return RedirectResponse(url="/admin/dashboard", status_code=302)
    return templates.TemplateResponse("admin/auth/login.html", {"request": request})


@router.post("/login")
async def login_submit(
    request: Request,
    db: AsyncSession = Depends(get_db),
    phone: str = Form(...),
    password: str = Form(...),
):
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalars().first()

    # Single message for any failure (no user enumeration)
    if not user or not verify_password(password, user.password_hash) or user.role != UserRole.admin:
        return templates.TemplateResponse(
            "admin/auth/login.html",
            {"request": request, "error": "Identifiants incorrects ou accès non autorisé.", "phone": phone},
            status_code=400,
        )

    token = create_session_token(user.id)
    csrf = create_csrf_token()
    response = RedirectResponse(url="/admin/dashboard", status_code=302)
    response.set_cookie(
        "admin_session",
        token,
        httponly=True,
        samesite="lax",
        max_age=8 * 3600,
        secure=False,
    )
    # admin_csrf must NOT be httponly — JS reads it for the double-submit pattern
    response.set_cookie(
        "admin_csrf",
        csrf,
        httponly=False,
        samesite="lax",
        max_age=8 * 3600,
        secure=False,
    )
    return response


@router.post("/logout")
async def logout(
    request: Request,
    admin: User = Depends(require_admin_session),
):
    response = RedirectResponse(url="/admin/login", status_code=302)
    response.delete_cookie("admin_session")
    response.delete_cookie("admin_csrf")
    return response
