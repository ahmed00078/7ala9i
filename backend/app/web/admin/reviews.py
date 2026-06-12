from uuid import UUID

from fastapi import APIRouter, Request, Depends, Form, Query
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.services.admin_audit import log_action
from app.web.admin.deps import require_admin_session
from app.web.admin.shared import templates, paginate, set_flash

router = APIRouter()
PER_PAGE = 25


@router.get("/reviews", response_class=HTMLResponse)
async def list_reviews(
    request: Request,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    rating: str = Query("all"),
    page: int = Query(1, ge=1),
):
    query = select(Review)
    if rating == "low":
        query = query.where(Review.rating <= 2)
    elif rating == "high":
        query = query.where(Review.rating >= 4)
    query = (
        query.order_by(Review.rating.asc(), Review.created_at.desc())
        .offset((page - 1) * PER_PAGE).limit(PER_PAGE + 1)
    )
    raw = (await db.execute(query)).scalars().all()

    pg = paginate(page, raw)
    return templates.TemplateResponse(
        "admin/reviews/list.html",
        {
            "request": request, "admin": admin, "reviews": pg["items"],
            "page": pg["page"], "has_next": pg["has_next"], "has_prev": pg["has_prev"],
            "rating_filter": rating, "active_page": "reviews",
        },
    )


@router.post("/reviews/{review_id}/delete")
async def delete_review(
    request: Request,
    review_id: UUID,
    admin: User = Depends(require_admin_session),
    db: AsyncSession = Depends(get_db),
    reason: str = Form(""),
):
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalars().first()
    if not review:
        return Response("Not found", status_code=404)
    await log_action(
        db, admin.id, "review.delete", "review", review_id,
        reason=reason or None,
        extra={"rating": review.rating, "salon_id": str(review.salon_id)},
    )
    await db.delete(review)

    if request.headers.get("HX-Request"):
        return Response(status_code=204, headers={"HX-Trigger": "refreshList"})
    set_flash(request, "Avis supprimé.")
    return RedirectResponse(url="/admin/reviews", status_code=302)
