from uuid import UUID
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.salon_closure import SalonClosure
from app.models.service import ServiceCategory, Service
from app.models.booking import Booking, BookingStatus, PaymentMethod
from app.models.review import Review
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
from app.schemas.booking import BookingResponse, BookingStatusUpdate, OwnerBookingCreate
from app.schemas.closure import ClosureCreate, ClosureUpdate, ClosureResponse
from app.schemas.review import ReviewResponse, ReviewReplyRequest
from app.api.deps import require_role
from app.services.booking_service import create_booking_with_lock
from app.schemas.booking import BookingCreate
from app.services.notification_service import (
    notify_booking_completed,
    notify_booking_no_show,
    notify_booking_cancelled_by_owner,
    notify_review_reply,
)
from app.utils.security import hash_password
import secrets

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
    # Fall back to first photo if cover_photo_url is missing or points to a deleted photo
    valid_urls = {p.photo_url for p in salon.photos} if salon.photos else set()
    if salon.cover_photo_url not in valid_urls:
        salon.cover_photo_url = sorted(salon.photos, key=lambda p: p.sort_order)[0].photo_url if salon.photos else None
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

    # Week stats — span the full ISO week (Mon–Sun). `total` counts the
    # scheduled load (confirmed + completed); `revenue` is money already
    # earned (completed only). Future confirmed bookings stay out of the
    # revenue total — they're not money in pocket until they're marked done.
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    week_result = await db.execute(
        select(Booking).where(
            and_(
                Booking.salon_id == salon.id,
                Booking.booking_date >= week_start,
                Booking.booking_date <= week_end,
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
            "revenue": sum(b.total_price for b in week_completed),
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
    month: bool = False,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    target_date = date_param or datetime.now(timezone.utc).date()

    query = select(Booking).options(
        selectinload(Booking.service),
        selectinload(Booking.client),
    ).where(Booking.salon_id == salon.id)

    if month:
        # Anchor on the visible month from the given date.
        month_start = target_date.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1) - timedelta(days=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1) - timedelta(days=1)
        query = query.where(
            and_(
                Booking.booking_date >= month_start,
                Booking.booking_date <= month_end,
            )
        )
    elif week:
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
    body: BookingStatusUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    """Owner can mark a booking as completed, no_show, or cancelled."""
    salon = await _get_owner_salon(current_user.id, db)

    allowed_transitions: dict[BookingStatus, list[BookingStatus]] = {
        BookingStatus.confirmed: [BookingStatus.completed, BookingStatus.no_show, BookingStatus.cancelled],
    }

    new_status_str = body.status
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
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    current_status = booking.status
    if new_status not in allowed_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from '{current_status}' to '{new_status}'",
        )

    booking.status = new_status

    # Only tag payment_method when transitioning to `completed`. For
    # no_show / cancelled we leave whatever the column held (typically NULL)
    # — that way an erroneous "no_show" undo wouldn't blow away a method.
    if new_status == BookingStatus.completed and body.payment_method is not None:
        try:
            booking.payment_method = PaymentMethod(body.payment_method)
        except (ValueError, KeyError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid payment_method: {body.payment_method}",
            )

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

    # Auto-set cover photo if salon has none or current cover is orphaned
    existing_urls = {p.photo_url for p in salon.photos}
    existing_urls.add(photo.photo_url)  # include the just-uploaded photo
    if not salon.cover_photo_url or salon.cover_photo_url not in existing_urls:
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


# ─── Owner-created bookings (walk-ins / phone calls) ────────────────────────

@router.post("/bookings", response_model=BookingResponse, status_code=201)
async def create_walkin_booking(
    data: OwnerBookingCreate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    """Owner-driven booking for walk-ins or phone calls.

    Finds-or-creates a guest user by phone, then funnels through the same
    locked booking path as client bookings so concurrency guarantees hold.
    No client push is fired — walk-ins likely don't have the app installed.
    """
    salon = await _get_owner_salon(current_user.id, db)

    phone = data.phone.strip()
    if not phone.isdigit() or len(phone) != 8:
        raise HTTPException(
            status_code=400,
            detail="Phone must be 8 digits",
        )

    user_result = await db.execute(select(User).where(User.phone == phone))
    guest = user_result.scalars().first()
    if guest and guest.deleted_at is not None:
        raise HTTPException(
            status_code=409,
            detail="That phone belongs to a deleted account. Ask the client to use a different number.",
        )
    if not guest:
        guest = User(
            phone=phone,
            first_name=data.first_name.strip() or "Walk-in",
            last_name=(data.last_name or "").strip(),
            role=UserRole.client,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            is_approved=True,
            is_phone_verified=False,
            language_pref="fr",
        )
        db.add(guest)
        await db.flush()
        await db.refresh(guest)

    booking = await create_booking_with_lock(
        db,
        client_id=guest.id,
        data=BookingCreate(
            salon_id=salon.id,
            service_id=data.service_id,
            booking_date=data.booking_date,
            start_time=data.start_time,
        ),
    )
    # Re-fetch with relationships so the response includes service/client/salon
    fetched = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.service),
            selectinload(Booking.client),
            selectinload(Booking.salon),
        )
        .where(Booking.id == booking.id)
    )
    return fetched.scalars().first()


# ─── Ad-hoc closures (Eid, sick days, lunch breaks) ────────────────────────

@router.get("/closures", response_model=list[ClosureResponse])
async def list_closures(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    today = datetime.now(timezone.utc).date()
    window_start = datetime.combine(from_date or today, datetime.min.time()).replace(tzinfo=timezone.utc)
    window_end = datetime.combine(
        to_date or (today + timedelta(days=90)),
        datetime.max.time(),
    ).replace(tzinfo=timezone.utc)

    result = await db.execute(
        select(SalonClosure)
        .where(
            and_(
                SalonClosure.salon_id == salon.id,
                SalonClosure.end_at >= window_start,
                SalonClosure.start_at <= window_end,
            )
        )
        .order_by(SalonClosure.start_at)
    )
    return result.scalars().all()


@router.post("/closures", response_model=ClosureResponse, status_code=201)
async def create_closure(
    data: ClosureCreate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    closure = SalonClosure(
        salon_id=salon.id,
        start_at=data.start_at,
        end_at=data.end_at,
        reason=data.reason,
    )
    db.add(closure)
    await db.flush()
    await db.refresh(closure)
    return closure


@router.patch("/closures/{closure_id}", response_model=ClosureResponse)
async def update_closure(
    closure_id: UUID,
    data: ClosureUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(SalonClosure).where(
            and_(SalonClosure.id == closure_id, SalonClosure.salon_id == salon.id)
        )
    )
    closure = result.scalars().first()
    if not closure:
        raise HTTPException(status_code=404, detail="Closure not found")

    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(closure, field, value)

    if closure.end_at <= closure.start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")

    await db.flush()
    await db.refresh(closure)
    return closure


@router.delete("/closures/{closure_id}", status_code=204)
async def delete_closure(
    closure_id: UUID,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(SalonClosure).where(
            and_(SalonClosure.id == closure_id, SalonClosure.salon_id == salon.id)
        )
    )
    closure = result.scalars().first()
    if not closure:
        raise HTTPException(status_code=404, detail="Closure not found")
    await db.delete(closure)
    await db.flush()


# ─── Owner reviews + replies ───────────────────────────────────────────────

@router.get("/reviews", response_model=list[ReviewResponse])
async def list_owner_reviews(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    salon = await _get_owner_salon(current_user.id, db)
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.client))
        .where(Review.salon_id == salon.id)
        .order_by(Review.created_at.desc())
    )
    return result.scalars().all()


async def _load_owner_review(review_id: UUID, owner_id: UUID, db: AsyncSession) -> Review:
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.salon), selectinload(Review.client))
        .where(Review.id == review_id)
    )
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.salon.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not your salon")
    return review


@router.post("/reviews/{review_id}/reply", response_model=ReviewResponse)
async def reply_to_review(
    review_id: UUID,
    data: ReviewReplyRequest,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    review = await _load_owner_review(review_id, current_user.id, db)
    reply_text = data.text.strip()[:500]
    review.owner_reply = reply_text
    review.owner_reply_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(review)

    try:
        await notify_review_reply(
            db=db,
            client_id=review.client_id,
            salon_name=review.salon.name,
            reply_excerpt=reply_text[:80],
            review_id=review.id,
            salon_id=review.salon_id,
        )
    except Exception:
        pass

    return review


@router.patch("/reviews/{review_id}/reply", response_model=ReviewResponse)
async def update_review_reply(
    review_id: UUID,
    data: ReviewReplyRequest,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    review = await _load_owner_review(review_id, current_user.id, db)
    if not review.owner_reply:
        raise HTTPException(status_code=404, detail="No existing reply to update")
    review.owner_reply = data.text.strip()[:500]
    review.owner_reply_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(review)
    return review


@router.delete("/reviews/{review_id}/reply", response_model=ReviewResponse)
async def delete_review_reply(
    review_id: UUID,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    review = await _load_owner_review(review_id, current_user.id, db)
    review.owner_reply = None
    review.owner_reply_at = None
    await db.flush()
    await db.refresh(review)
    return review


# ─── Earnings (period-based financial breakdown) ───────────────────────────

def _resolve_earnings_window(
    period: str,
    today: date,
    from_param: date | None,
    to_param: date | None,
) -> tuple[date, date, date, date, str]:
    """Resolve (window_from, window_to, prev_from, prev_to, label).

    The previous-period window is the same length as the current one,
    ending the day before `window_from`. This gives delta semantics that
    match what the owner intuitively expects (week→last week, month→last
    month, today→yesterday, custom→same-length window before).
    """
    if period == "today":
        return today, today, today - timedelta(days=1), today - timedelta(days=1), "today"

    if period == "week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        prev_start = start - timedelta(days=7)
        prev_end = end - timedelta(days=7)
        return start, end, prev_start, prev_end, "week"

    if period == "month":
        start = today.replace(day=1)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1) - timedelta(days=1)
        else:
            end = start.replace(month=start.month + 1) - timedelta(days=1)
        # Previous month: anchor to last day of previous month, then go to its day 1.
        prev_end = start - timedelta(days=1)
        prev_start = prev_end.replace(day=1)
        return start, end, prev_start, prev_end, "month"

    if period == "custom":
        if from_param is None or to_param is None:
            raise HTTPException(
                status_code=400,
                detail="`from` and `to` are required for period=custom",
            )
        if to_param < from_param:
            raise HTTPException(status_code=400, detail="`to` must be on or after `from`")
        length = (to_param - from_param).days + 1
        prev_end = from_param - timedelta(days=1)
        prev_start = prev_end - timedelta(days=length - 1)
        return from_param, to_param, prev_start, prev_end, "custom"

    raise HTTPException(status_code=400, detail=f"Unknown period: {period}")


@router.get("/earnings")
async def get_earnings(
    period: str = Query("week", description="today | week | month | custom"),
    from_param: date | None = Query(None, alias="from"),
    to_param: date | None = Query(None, alias="to"),
    current_user: User = Depends(require_role(UserRole.owner)),
    db: AsyncSession = Depends(get_db),
):
    """Single aggregated payload for the Earnings screen.

    Revenue counts only `completed` bookings — that's the money already
    in pocket. Future `confirmed` bookings don't inflate today's earnings.
    `no_show` and `cancelled` are surfaced separately as "impact".
    `completion_rate` = completed / (completed + no_show + cancelled) — the
    rate of clients who actually showed up, out of resolved bookings.
    Top services sort by booked-count desc, then revenue desc.
    """
    salon = await _get_owner_salon(current_user.id, db)
    today = datetime.now(timezone.utc).date()
    window_from, window_to, prev_from, prev_to, label = _resolve_earnings_window(
        period, today, from_param, to_param
    )

    def _scope(start: date, end: date):
        return and_(
            Booking.salon_id == salon.id,
            Booking.booking_date >= start,
            Booking.booking_date <= end,
        )

    # Current-period revenue + booking counts — completed only.
    completed_result = await db.execute(
        select(
            func.coalesce(func.sum(Booking.total_price), 0),
            func.count(Booking.id),
        ).where(_scope(window_from, window_to), Booking.status == BookingStatus.completed)
    )
    revenue, completed_count = completed_result.one()
    bookings_count = completed_count

    # Previous-period revenue for delta — same completed-only semantics.
    prev_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Booking.total_price), 0)).where(
            _scope(prev_from, prev_to),
            Booking.status == BookingStatus.completed,
        )
    )
    revenue_previous = prev_revenue_result.scalar() or 0

    delta_percent: float | None
    if revenue_previous == 0:
        delta_percent = None if revenue == 0 else 100.0
    else:
        delta_percent = round(((revenue - revenue_previous) / revenue_previous) * 100, 1)

    avg_ticket = round(revenue / completed_count) if completed_count else 0

    # Completion rate = how many resolved appointments actually completed.
    # Resolved = completed + no_show + cancelled (we ignore future-confirmed).
    resolved_result = await db.execute(
        select(func.count(Booking.id)).where(
            _scope(window_from, window_to),
            Booking.status.in_(
                [BookingStatus.completed, BookingStatus.no_show, BookingStatus.cancelled]
            ),
        )
    )
    resolved_count = resolved_result.scalar() or 0
    completion_rate = round(completed_count / resolved_count, 2) if resolved_count else 0.0

    # Payment-method breakdown — completed bookings only (others haven't been paid yet).
    pm_result = await db.execute(
        select(
            Booking.payment_method,
            func.coalesce(func.sum(Booking.total_price), 0),
        )
        .where(_scope(window_from, window_to), Booking.status == BookingStatus.completed)
        .group_by(Booking.payment_method)
    )
    by_payment_method = {"cash": 0, "mobile": 0, "unset": 0}
    for method, amount in pm_result.all():
        key = method.value if method is not None else "unset"
        # Keep the dict tolerant of legacy enum values mid-migration
        # — they'll land under 'mobile' so they're still surfaced.
        if key not in by_payment_method:
            key = "mobile"
        by_payment_method[key] = int(amount or 0)

    # Top services — completed bookings only — joined with service for the name.
    top_services_result = await db.execute(
        select(
            Service.id,
            Service.name,
            Service.name_ar,
            func.count(Booking.id).label("count"),
            func.coalesce(func.sum(Booking.total_price), 0).label("revenue"),
        )
        .join(Service, Service.id == Booking.service_id)
        .where(_scope(window_from, window_to), Booking.status == BookingStatus.completed)
        .group_by(Service.id, Service.name, Service.name_ar)
        .order_by(func.count(Booking.id).desc(), func.sum(Booking.total_price).desc())
        .limit(5)
    )
    top_services = [
        {
            "id": str(row.id),
            "name": row.name,
            "name_ar": row.name_ar,
            "count": int(row.count),
            "revenue": int(row.revenue or 0),
        }
        for row in top_services_result.all()
    ]

    # No-show + cancellation impact (expected MRU lost).
    no_show_result = await db.execute(
        select(
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total_price), 0),
        ).where(_scope(window_from, window_to), Booking.status == BookingStatus.no_show)
    )
    no_show_count, no_show_lost = no_show_result.one()

    cancel_result = await db.execute(
        select(
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total_price), 0),
        ).where(_scope(window_from, window_to), Booking.status == BookingStatus.cancelled)
    )
    cancel_count, cancel_lost = cancel_result.one()

    return {
        "period": {
            "label": label,
            "from": window_from.isoformat(),
            "to": window_to.isoformat(),
        },
        "previous_period": {
            "from": prev_from.isoformat(),
            "to": prev_to.isoformat(),
        },
        "revenue": int(revenue or 0),
        "revenue_previous": int(revenue_previous or 0),
        "delta_percent": delta_percent,
        "bookings_count": int(bookings_count),
        "completed_count": int(completed_count),
        "completed_revenue": int(revenue or 0),
        "avg_ticket": int(avg_ticket),
        "completion_rate": float(completion_rate),
        "by_payment_method": by_payment_method,
        "top_services": top_services,
        "no_show_impact": {
            "count": int(no_show_count),
            "revenue_lost": int(no_show_lost or 0),
        },
        "cancellation_impact": {
            "count": int(cancel_count),
            "revenue_lost": int(cancel_lost or 0),
        },
    }
