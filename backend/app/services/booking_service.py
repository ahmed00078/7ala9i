from uuid import UUID
from datetime import date, time, datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.salon import Salon
from app.models.salon_closure import SalonClosure
from app.models.service import Service
from app.models.working_hours import WorkingHours
from app.schemas.booking import BookingCreate


async def create_booking_with_lock(
    db: AsyncSession,
    client_id: UUID,
    data: BookingCreate,
) -> Booking:
    return await create_booking(
        db,
        client_id=client_id,
        salon_id=data.salon_id,
        service_id=data.service_id,
        booking_date=data.booking_date,
        start_time=data.start_time,
    )


async def create_booking(
    db: AsyncSession,
    client_id: UUID,
    salon_id: UUID,
    service_id: UUID,
    booking_date: date,
    start_time: time,
) -> Booking:
    # Acquire a row-level lock on the salon first so concurrent bookings for the
    # same salon are serialised — prevents double-booking on empty slots where
    # no conflicting rows exist yet to lock.
    salon_result = await db.execute(
        select(Salon).where(Salon.id == salon_id).with_for_update()
    )
    salon = salon_result.scalars().first()
    if not salon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    if not salon.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Salon is not accepting bookings",
        )

    service = await db.get(Service, service_id)
    if not service or str(service.salon_id) != str(salon_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found in this salon",
        )

    if not service.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service is not available",
        )

    day_of_week = booking_date.weekday()
    result = await db.execute(
        select(WorkingHours).where(
            and_(
                WorkingHours.salon_id == salon_id,
                WorkingHours.day_of_week == day_of_week,
            )
        )
    )
    working_hours = result.scalar_one_or_none()

    if not working_hours or working_hours.is_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Salon is closed on this day",
        )

    end_minutes = start_time.hour * 60 + start_time.minute + service.duration
    end_time = time(end_minutes // 60, end_minutes % 60)

    if start_time < working_hours.open_time or end_time > working_hours.close_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot is outside working hours",
        )

    now = datetime.now(timezone.utc)
    if booking_date == now.date() and start_time <= now.time():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book a past time slot",
        )

    if booking_date < now.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book a past date",
        )

    # Lock existing bookings to prevent double-booking
    result = await db.execute(
        select(Booking)
        .where(
            and_(
                Booking.salon_id == salon_id,
                Booking.booking_date == booking_date,
                Booking.status == BookingStatus.confirmed,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        )
        .with_for_update()
    )
    conflicts = result.scalars().all()

    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked",
        )

    # Reject if the slot overlaps an ad-hoc closure (Eid, lunch break, sick day).
    slot_start_dt = datetime.combine(booking_date, start_time).replace(tzinfo=timezone.utc)
    slot_end_dt = datetime.combine(booking_date, end_time).replace(tzinfo=timezone.utc)
    closure_result = await db.execute(
        select(SalonClosure).where(
            and_(
                SalonClosure.salon_id == salon_id,
                SalonClosure.start_at < slot_end_dt,
                SalonClosure.end_at > slot_start_dt,
            )
        )
    )
    if closure_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is blocked by a salon closure",
        )

    booking = Booking(
        client_id=client_id,
        salon_id=salon_id,
        service_id=service_id,
        booking_date=booking_date,
        start_time=start_time,
        end_time=end_time,
        status=BookingStatus.confirmed,
        total_price=service.price,
    )

    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    return booking
