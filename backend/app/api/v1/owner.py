from uuid import UUID
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.service import ServiceCategory, Service
from app.models.booking import Booking, BookingStatus
from app.models.working_hours import WorkingHours
from app.schemas.salon import (
    SalonDetailResponse,
    SalonUpdate,
    WorkingHoursResponse,
    WorkingHoursUpdate,
    WorkingHoursBulkUpdate,
)
from app.schemas.service import (
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryResponse,
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
)
from app.schemas.booking import BookingResponse
from app.api.deps import require_role
from app.services.notification_service import (
    notify_booking_completed,
    notify_booking_no_show,
    notify_booking_cancelled_by_owner,
)

router = APIRouter(prefix="/owner", tags=["owner"])


async def _get_owner_salon(owner_id: UUID, db: AsyncSession) -> Salon:
    result = await db.execute(
        select(Salon)
        .options(
            selectinload(Salon.photos),
            selectinload(Salon.service_categories).selectinload(ServiceCategory.services),
            selectinload(Salon.working_hours),
        )
        .where(Salon.owner_id == owner_id)
        .limit(1)
    )
    salon = result.scalars().first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No salon found for this owner",
        )
    # Fall back to first photo if cover_photo_url is not set
    if not salon.cover_photo_url and salon.photos:
        salon.cover_photo_url = sorted(salon.photos, key=lambda p: p.sort_order)[0].photo_url
    return salon


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    today = datetime.now(timezone.utc).date()

    # Today's stats — include all non-cancelled/no_show statuses
    today_bookings_result = await db.execute(
        select(Booking).options(
            selectinload(Booking.service),
            selectinload(Booking.client),
        ).where(
            and_(
                Booking.salon_id == salon.id,
                Booking.booking_date == today,
            )
        ).order_by(Booking.start_time)
    )
    today_bookings = today_bookings_result.scalars().all()

    today_confirmed = [b for b in today_bookings if b.status == BookingStatus.confirmed]
    today_completed = [b for b in today_bookings if b.status == BookingStatus.completed]
    # Estimated revenue: all confirmed + completed bookings for today
    today_revenue_confirmed = sum(b.total_price for b in today_confirmed)
    today_revenue_completed = sum(b.total_price for b in today_completed)

    # Upcoming appointments today (confirmed, not yet passed)
    now_time = datetime.now(timezone.utc).time()
    upcoming_today = [b for b in today_confirmed if b.start_time >= now_time]
    upcoming_today.sort(key=lambda b: b.start_time)

    # All upcoming confirmed bookings (today + future)
    upcoming_all_result = await db.execute(
        select(Booking).options(
            selectinload(Booking.service),
            selectinload(Booking.client),
        ).where(
            and_(
                Booking.salon_id == salon.id,
                Booking.status == BookingStatus.confirmed,
                Booking.booking_date >= today,
            )
        ).order_by(Booking.booking_date, Booking.start_time)
    )
    upcoming_all = upcoming_all_result.scalars().all()

    # Week stats — confirmed + completed
    week_start = today - timedelta(days=today.weekday())
    week_result = await db.execute(
        select(Booking).where(
            and_(
                Booking.salon_id == salon.id,
                Booking.booking_date >= week_start,
                Booking.booking_date <= today,
                Booking.status.in_([BookingStatus.confirmed, BookingStatus.completed]),
            )
        )
    )
    week_bookings = week_result.scalars().all()
    week_completed = [b for b in week_bookings if b.status == BookingStatus.completed]

    return {
        "today": {
            "total_bookings": len(today_bookings),
            "confirmed": len(today_confirmed),
            "completed": len(today_completed),
            "revenue_completed": today_revenue_completed,
            "revenue_expected": today_revenue_confirmed + today_revenue_completed,
        },
        "week": {
            "total": len(week_bookings),
            "completed": len(week_completed),
            "revenue": sum(b.total_price for b in week_bookings),
        },
        "upcoming_count": len(upcoming_all),
        "upcoming_appointments": [
            BookingResponse.model_validate(b) for b in upcoming_all[:10]
        ],
        "salon_id": str(salon.id),
        "salon_name": salon.name,
    }


@router.get("/appointments", response_model=list[BookingResponse])
async def get_appointments(
    date_param: date | None = Query(None, alias="date"),
    week: bool = False,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    target_date = date_param or datetime.now(timezone.utc).date()

    query = select(Booking).options(
        selectinload(Booking.service),
        selectinload(Booking.client),
    ).where(Booking.salon_id == salon.id)

    if week:
        week_start = target_date - timedelta(days=target_date.weekday())
        week_end = week_start + timedelta(days=6)
        query = query.where(
            and_(
                Booking.booking_date >= week_start,
                Booking.booking_date <= week_end,
            )
        )
    else:
        query = query.where(Booking.booking_date == target_date)

    query = query.order_by(Booking.booking_date, Booking.start_time)
    result = await db.execute(query)
    bookings = result.scalars().all()
    return bookings


@router.patch("/appointments/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: UUID,
    body: dict,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    """Owner can mark a booking as completed, no_show, or cancelled."""
    salon = await _get_owner_salon(current_user.id, db)

    allowed_transitions: dict[BookingStatus, list[BookingStatus]] = {
        BookingStatus.confirmed: [BookingStatus.completed, BookingStatus.no_show, BookingStatus.cancelled],
    }

    new_status_str = body.get("status")
    try:
        new_status = BookingStatus(new_status_str)
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status_str}")

    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == booking_id,
                Booking.salon_id == salon.id,
            )
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    current_status = booking.status
    if new_status not in allowed_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from '{current_status}' to '{new_status}'",
        )

    booking.status = new_status
    await db.flush()
    await db.refresh(booking)

    # Notify client about status change
    try:
        if new_status == BookingStatus.completed:
            await notify_booking_completed(db, booking.client_id, salon.name, booking.id)
        elif new_status == BookingStatus.no_show:
            await notify_booking_no_show(db, booking.client_id, salon.name, booking.id)
        elif new_status == BookingStatus.cancelled:
            await notify_booking_cancelled_by_owner(
                db=db,
                client_id=booking.client_id,
                salon_name=salon.name,
                booking_date=booking.booking_date,
                start_time=booking.start_time,
                booking_id=booking.id,
            )
    except Exception:
        pass

    return BookingResponse.model_validate(booking)


@router.get("/salon", response_model=SalonDetailResponse)
async def get_own_salon(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owner_salon(current_user.id, db)


@router.patch("/salon", response_model=SalonDetailResponse)
async def update_own_salon(
    data: SalonUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(salon, field, value)
    await db.flush()
    # Reload with relationships
    return await _get_owner_salon(current_user.id, db)


# --- Service Categories ---

@router.post("/categories", response_model=ServiceCategoryResponse, status_code=201)
async def create_category(
    data: ServiceCategoryCreate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    category = ServiceCategory(
        salon_id=salon.id,
        name=data.name,
        name_ar=data.name_ar,
        sort_order=data.sort_order,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=ServiceCategoryResponse)
async def update_category(
    category_id: UUID,
    data: ServiceCategoryUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(ServiceCategory).where(
            and_(
                ServiceCategory.id == category_id,
                ServiceCategory.salon_id == salon.id,
            )
        )
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.flush()
    await db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(ServiceCategory).where(
            and_(
                ServiceCategory.id == category_id,
                ServiceCategory.salon_id == salon.id,
            )
        )
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(category)
    await db.flush()


# --- Services ---

@router.post("/services", response_model=ServiceResponse, status_code=201)
async def create_service(
    data: ServiceCreate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)

    # Verify category belongs to salon
    result = await db.execute(
        select(ServiceCategory).where(
            and_(
                ServiceCategory.id == data.category_id,
                ServiceCategory.salon_id == salon.id,
            )
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")

    service = Service(
        category_id=data.category_id,
        salon_id=salon.id,
        name=data.name,
        name_ar=data.name_ar,
        price=data.price,
        duration=data.duration,
        is_active=data.is_active,
    )
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.salon_id == salon.id)
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    await db.flush()
    await db.refresh(service)
    return service


@router.delete("/services/{service_id}", status_code=204)
async def delete_service(
    service_id: UUID,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.salon_id == salon.id)
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    await db.delete(service)
    await db.flush()


# --- Working Hours ---

@router.get("/working-hours", response_model=list[WorkingHoursResponse])
async def get_working_hours(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(WorkingHours)
        .where(WorkingHours.salon_id == salon.id)
        .order_by(WorkingHours.day_of_week)
    )
    return result.scalars().all()


@router.put("/working-hours", response_model=list[WorkingHoursResponse])
async def update_working_hours(
    data: WorkingHoursBulkUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)

    # Delete existing hours
    result = await db.execute(
        select(WorkingHours).where(WorkingHours.salon_id == salon.id)
    )
    existing = result.scalars().all()
    for h in existing:
        await db.delete(h)
    await db.flush()

    # Create new hours
    new_hours = []
    for h in data.hours:
        wh = WorkingHours(
            salon_id=salon.id,
            day_of_week=h.day_of_week,
            open_time=h.open_time,
            close_time=h.close_time,
            is_closed=h.is_closed,
        )
        db.add(wh)
        new_hours.append(wh)

    await db.flush()
    for h in new_hours:
        await db.refresh(h)

    return sorted(new_hours, key=lambda x: x.day_of_week)


# ─── Photo management ───────────────────────────────────────────────────────

import io
import os
import uuid as _uuid
from fastapi import UploadFile, File
from app.models.salon import SalonPhoto
from app.schemas.salon import SalonPhotoResponse
from app.config import settings

import cloudinary
import cloudinary.uploader

# Configure Cloudinary (reads from env if settings are set)
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

# Keep local uploads dir as fallback for dev
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def _upload_to_cloudinary(content: bytes, filename: str) -> str:
    """Upload image bytes to Cloudinary, return the secure URL."""
    result = cloudinary.uploader.upload(
        io.BytesIO(content),
        folder="halagi/salons",
        public_id=filename.rsplit(".", 1)[0],
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]


def _delete_from_cloudinary(photo_url: str) -> None:
    """Delete an image from Cloudinary by its URL."""
    # Extract public_id from URL: .../halagi/salons/uuid.jpg → halagi/salons/uuid
    try:
        parts = photo_url.split("/upload/")
        if len(parts) == 2:
            # Remove version prefix (v1234567890/) and extension
            path = parts[1].split("/", 1)[1] if "/" in parts[1] else parts[1]
            public_id = path.rsplit(".", 1)[0]
            cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception:
        pass  # Best-effort deletion


@router.post("/photos", response_model=SalonPhotoResponse, status_code=201)
async def upload_salon_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        ext = "jpg"

    filename = f"{_uuid.uuid4()}.{ext}"
    content = await file.read()

    # Upload to Cloudinary if configured, else fall back to local disk
    if settings.CLOUDINARY_CLOUD_NAME:
        photo_url = _upload_to_cloudinary(content, filename)
    else:
        filepath = os.path.join(UPLOADS_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        photo_url = f"/uploads/{filename}"

    # Count existing photos for sort order
    count_result = await db.execute(
        select(func.count()).where(SalonPhoto.salon_id == salon.id)
    )
    sort_order = count_result.scalar() or 0

    photo = SalonPhoto(
        salon_id=salon.id,
        photo_url=photo_url,
        sort_order=sort_order,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)

    # Auto-set cover photo if salon has none
    if not salon.cover_photo_url:
        salon.cover_photo_url = photo.photo_url
        await db.flush()

    return photo


@router.delete("/photos/{photo_id}", status_code=204)
async def delete_salon_photo(
    photo_id: UUID,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)

    result = await db.execute(
        select(SalonPhoto).where(
            SalonPhoto.id == photo_id,
            SalonPhoto.salon_id == salon.id,
        )
    )
    photo = result.scalars().first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    deleted_url = photo.photo_url

    # Delete from storage
    if deleted_url.startswith("http") and "cloudinary" in deleted_url:
        _delete_from_cloudinary(deleted_url)
    elif deleted_url.startswith("/uploads/"):
        filepath = os.path.join(UPLOADS_DIR, deleted_url.split("/uploads/")[1])
        if os.path.exists(filepath):
            os.remove(filepath)

    await db.delete(photo)
    await db.flush()

    # If the deleted photo was the cover, reassign to next available photo
    if salon.cover_photo_url == deleted_url:
        remaining_result = await db.execute(
            select(SalonPhoto)
            .where(SalonPhoto.salon_id == salon.id)
            .order_by(SalonPhoto.sort_order)
            .limit(1)
        )
        next_photo = remaining_result.scalars().first()
        salon.cover_photo_url = next_photo.photo_url if next_photo else None
        await db.flush()
