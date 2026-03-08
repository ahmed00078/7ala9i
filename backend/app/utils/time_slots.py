from datetime import date, time, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.service import Service
from app.models.working_hours import WorkingHours


async def get_available_slots(
    db: AsyncSession,
    salon_id: UUID,
    service_id: UUID,
    target_date: date,
) -> list[str]:
    # 1. Get service duration
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        return []

    duration = service.duration

    # 2. Get working hours for the day_of_week
    day_of_week = target_date.weekday()  # 0=Mon to 6=Sun
    result = await db.execute(
        select(WorkingHours).where(
            and_(
                WorkingHours.salon_id == salon_id,
                WorkingHours.day_of_week == day_of_week,
            )
        )
    )
    wh = result.scalar_one_or_none()

    if not wh or wh.is_closed:
        return []

    open_time = wh.open_time
    close_time = wh.close_time

    # 3. Generate 30-min interval slots within open -> close
    slots: list[time] = []
    current = datetime.combine(target_date, open_time)
    end_boundary = datetime.combine(target_date, close_time)

    while current + timedelta(minutes=duration) <= end_boundary:
        slots.append(current.time())
        current += timedelta(minutes=30)

    if not slots:
        return []

    # 4. Fetch confirmed bookings for salon + date
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.salon_id == salon_id,
                Booking.booking_date == target_date,
                Booking.status == BookingStatus.confirmed,
            )
        )
    )
    existing_bookings = result.scalars().all()

    # 5. Remove overlapping slots
    available_slots: list[str] = []
    for slot in slots:
        slot_start = datetime.combine(target_date, slot)
        slot_end = slot_start + timedelta(minutes=duration)

        is_available = True
        for booking in existing_bookings:
            booking_start = datetime.combine(target_date, booking.start_time)
            booking_end = datetime.combine(target_date, booking.end_time)

            # Check overlap: two intervals overlap if start1 < end2 and start2 < end1
            if slot_start < booking_end and booking_start < slot_end:
                is_available = False
                break

        if is_available:
            available_slots.append(slot.strftime("%H:%M"))

    # 6. If today, remove past slots
    now = datetime.now(timezone.utc)
    today = now.date()
    if target_date == today:
        current_time_str = now.strftime("%H:%M")
        available_slots = [s for s in available_slots if s > current_time_str]

    return available_slots
