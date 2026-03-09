from uuid import UUID
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.service import Service
from app.models.working_hours import WorkingHours
from app.schemas.booking import BookingCreate, BookingResponse, BookingReschedule
from app.services.booking_service import create_booking_with_lock
from app.services.notification_service import send_booking_notification

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = await create_booking_with_lock(db, current_user.id, data)

    # Send push notification to salon owner (fire and forget)
    try:
        await send_booking_notification(db, booking)
    except Exception:
        pass  # Don't fail the booking if notification fails

    await db.refresh(booking)
    return BookingResponse.model_validate(booking)


@router.get("", response_model=list[BookingResponse])
async def get_my_bookings(
    status_filter: str | None = Query(None, alias="status", description="upcoming or past"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Booking).where(Booking.client_id == current_user.id)

    today = date.today()
    if status_filter == "upcoming":
        query = query.where(
            and_(
                Booking.booking_date >= today,
                Booking.status == BookingStatus.confirmed,
            )
        )
        query = query.order_by(Booking.booking_date.asc(), Booking.start_time.asc())
    elif status_filter == "past":
        query = query.where(
            or_(
                Booking.booking_date < today,
                Booking.status.in_([
                    BookingStatus.completed,
                    BookingStatus.cancelled,
                    BookingStatus.no_show,
                ]),
            )
        )
        query = query.order_by(Booking.booking_date.desc(), Booking.start_time.desc())
    else:
        query = query.order_by(Booking.booking_date.desc(), Booking.start_time.desc())

    result = await db.execute(query)
    bookings = result.scalars().all()

    return [BookingResponse.model_validate(b) for b in bookings]


@router.put("/{booking_id}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    booking_id: UUID,
    data: BookingReschedule,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == booking_id,
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

    if booking.status != BookingStatus.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only confirmed bookings can be rescheduled",
        )

    # Get service duration to calculate new end time
    result = await db.execute(select(Service).where(Service.id == booking.service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    # Check working hours for new date
    day_of_week = data.booking_date.weekday()
    result = await db.execute(
        select(WorkingHours).where(
            and_(
                WorkingHours.salon_id == booking.salon_id,
                WorkingHours.day_of_week == day_of_week,
            )
        )
    )
    wh = result.scalar_one_or_none()
    if not wh or wh.is_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Salon is closed on the selected day",
        )

    start_dt = datetime.combine(data.booking_date, data.start_time)
    end_dt = start_dt + timedelta(minutes=service.duration)
    new_end_time = end_dt.time()

    # Check for overlapping bookings (excluding the current booking)
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.salon_id == booking.salon_id,
                Booking.booking_date == data.booking_date,
                Booking.status == BookingStatus.confirmed,
                Booking.id != booking_id,
            )
        )
    )
    existing_bookings = result.scalars().all()

    for existing in existing_bookings:
        existing_start = datetime.combine(data.booking_date, existing.start_time)
        existing_end = datetime.combine(data.booking_date, existing.end_time)
        if start_dt < existing_end and existing_start < end_dt:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Time slot is already booked",
            )

    booking.booking_date = data.booking_date
    booking.start_time = data.start_time
    booking.end_time = new_end_time
    await db.flush()
    await db.refresh(booking)

    return BookingResponse.model_validate(booking)


@router.put("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.id == booking_id,
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

    if booking.status != BookingStatus.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only confirmed bookings can be cancelled",
        )

    booking.status = BookingStatus.cancelled
    await db.flush()
    await db.refresh(booking)

    return BookingResponse.model_validate(booking)
