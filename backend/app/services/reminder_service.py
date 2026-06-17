import logging
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.services.notification_service import (
    notify_booking_reminder,
    notify_booking_reminder_24h,
)

logger = logging.getLogger(__name__)

# Reminder windows, in minutes-before-start. Each window is 10 min wide so the
# 5-minute scheduler always catches a booking at least once; the per-window
# "sent" flag guarantees it fires only once.
NotifyFn = Callable[..., Awaitable[None]]


async def _send_for_window(
    session: AsyncSession,
    lo_min: int,
    hi_min: int,
    sent_attr: str,
    notify_fn: NotifyFn,
) -> None:
    """Send a reminder to every confirmed booking whose start falls in the
    [now+lo_min, now+hi_min] window and that hasn't had this reminder yet.

    A booking made closer to its start than `lo_min` never enters this window,
    so it's naturally skipped (this is how a <24h booking gets only the 1h one).
    """
    now = datetime.now(timezone.utc)
    window_start_dt = now + timedelta(minutes=lo_min)
    window_end_dt = now + timedelta(minutes=hi_min)

    # Build date+time filter. When the window spans midnight the start and end
    # fall on different calendar dates, so we need OR logic.
    if window_start_dt.date() == window_end_dt.date():
        date_time_filter = and_(
            Booking.booking_date == window_start_dt.date(),
            Booking.start_time >= window_start_dt.time(),
            Booking.start_time <= window_end_dt.time(),
        )
    else:
        date_time_filter = or_(
            and_(
                Booking.booking_date == window_start_dt.date(),
                Booking.start_time >= window_start_dt.time(),
            ),
            and_(
                Booking.booking_date == window_end_dt.date(),
                Booking.start_time <= window_end_dt.time(),
            ),
        )

    result = await session.execute(
        select(Booking)
        .options(
            selectinload(Booking.salon),
            selectinload(Booking.client),
        )
        .where(
            and_(
                Booking.status == BookingStatus.confirmed,
                getattr(Booking, sent_attr) == False,  # noqa: E712
                date_time_filter,
            )
        )
    )
    bookings = result.scalars().all()

    logger.info(
        "Reminder check [%s, %dm–%dm]: found %d booking(s) due",
        sent_attr, lo_min, hi_min, len(bookings),
    )

    for booking in bookings:
        salon_name = booking.salon.name if booking.salon else "le salon"
        await notify_fn(
            db=session,
            client_id=booking.client_id,
            salon_name=salon_name,
            booking_date=booking.booking_date,
            start_time=booking.start_time,
            booking_id=booking.id,
        )
        setattr(booking, sent_attr, True)


async def send_upcoming_reminders() -> None:
    """
    Called every 5 minutes by APScheduler. Sends two independent reminders to the
    client: one ~24h before the appointment and one ~1h before. Each is tracked by
    its own flag, so a booking made well in advance gets both, while one made less
    than 24h ahead gets only the 1h reminder.
    """
    async with async_session_factory() as session:
        try:
            # ~24h before (23h55–24h05)
            await _send_for_window(
                session, 1435, 1445, "reminder_24h_sent", notify_booking_reminder_24h
            )
            # ~1h before (55–65 min)
            await _send_for_window(
                session, 55, 65, "reminder_sent", notify_booking_reminder
            )
            await session.commit()
        except Exception:
            logger.exception("Reminder job failed")
            await session.rollback()
