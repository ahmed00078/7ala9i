from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.salon import Salon
from app.schemas.review import ReviewCreate, ReviewResponse
from app.services.notification_service import notify_new_review

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the booking exists and belongs to the current user
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == data.booking_id,
                Booking.client_id == current_user.id,
            )
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # Only completed bookings can be reviewed
    if booking.status != BookingStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed bookings can be reviewed",
        )

    # Check if a review already exists for this booking
    result = await db.execute(
        select(Review).where(Review.booking_id == data.booking_id)
    )
    existing_review = result.scalar_one_or_none()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A review already exists for this booking",
        )

    review = Review(
        client_id=current_user.id,
        salon_id=booking.salon_id,
        booking_id=data.booking_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.flush()

    # Update salon average rating and total reviews
    result = await db.execute(
        select(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("total_reviews"),
        ).where(Review.salon_id == booking.salon_id)
    )
    stats = result.one()

    result = await db.execute(select(Salon).where(Salon.id == booking.salon_id))
    salon = result.scalar_one_or_none()
    if salon:
        salon.avg_rating = round(float(stats.avg_rating or 0), 2)
        salon.total_reviews = int(stats.total_reviews or 0)

    await db.flush()
    await db.refresh(review)

    # Notify salon owner about new review (fire-and-forget)
    try:
        if salon and salon.owner_id:
            client_name = f"{current_user.first_name} {current_user.last_name}".strip()
            await notify_new_review(
                db=db,
                owner_id=salon.owner_id,
                client_name=client_name,
                salon_name=salon.name,
                rating=data.rating,
                review_id=review.id,
                salon_id=salon.id,
            )
    except Exception:
        pass  # Don't fail the review if notification fails

    return ReviewResponse.model_validate(review)
