import os
from typing import Any
from fastapi import Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "templates")
_jinja_templates = Jinja2Templates(directory=TEMPLATES_DIR)
_jinja_templates.env.globals["enumerate"] = enumerate

PER_PAGE = 25


class _AdminTemplates:
    """Thin wrapper that auto-injects flash from request.session."""

    def TemplateResponse(
        self,
        name: str,
        context: dict[str, Any],
        status_code: int = 200,
        headers: dict | None = None,
    ) -> HTMLResponse:
        request: Request = context["request"]
        flash = request.session.pop("flash", None)
        # Build a context without the request key; pass request separately (new Starlette API)
        ctx = {k: v for k, v in context.items() if k != "request"}
        ctx.setdefault("flash", flash)
        return _jinja_templates.TemplateResponse(
            request=request,
            name=name,
            context=ctx,
            status_code=status_code,
            headers=headers,
        )

    @property
    def env(self):
        return _jinja_templates.env


templates = _AdminTemplates()


def paginate(page: int, raw: list, per_page: int = PER_PAGE) -> dict:
    has_next = len(raw) > per_page
    items = raw[:per_page]
    return {"items": items, "page": page, "has_next": has_next, "has_prev": page > 1, "per_page": per_page}


def set_flash(request: Request, message: str, kind: str = "success") -> None:
    request.session["flash"] = {"message": message, "kind": kind}
