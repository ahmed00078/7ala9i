import hmac
import uuid
from fastapi import Request, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import decode_session_token

_STATE_KEY = "_admin_user"


def _login_redirect():
    raise StarletteHTTPException(
        status_code=302,
        detail="Unauthorized",
        headers={"Location": "/admin/login"},
    )


async def require_admin_session(request: Request) -> User:
    """Validates admin_session cookie, CSRF on mutations, loads User once per request."""
    if hasattr(request.state, _STATE_KEY):
        user = getattr(request.state, _STATE_KEY)
        # Still need to do CSRF even on cached user
        await _check_csrf(request)
        return user

    token = request.cookies.get("admin_session")
    if not token:
        _login_redirect()

    payload = decode_session_token(token)
    if not payload:
        _login_redirect()

    user_id_str = payload.get("sub")
    if not user_id_str:
        _login_redirect()

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        _login_redirect()

    user = None
    async for db in get_db():
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        break

    if not user or user.role != UserRole.admin:
        _login_redirect()

    setattr(request.state, _STATE_KEY, user)

    await _check_csrf(request)

    return user


async def _check_csrf(request: Request) -> None:
    """Double-submit cookie CSRF check for non-safe methods."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    cookie = request.cookies.get("admin_csrf", "")
    if not cookie:
        raise HTTPException(status_code=403, detail="CSRF token missing")
    # HTMX sends via header; regular form submissions via hidden field
    token = request.headers.get("X-CSRF-Token", "")
    if not token:
        form = await request.form()
        token = str(form.get("csrf_token", ""))
    if not hmac.compare_digest(cookie, token):
        raise HTTPException(status_code=403, detail="CSRF validation failed")
