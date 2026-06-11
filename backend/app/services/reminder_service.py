import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.services.notification_service import notify_booking_reminder

logger = logging.getLogger(__name__)


async def send_upcoming_reminders() -> None:
    """
    Called every 5 minutes by APScheduler.
    Finds confirmed bookings starting in 55–65 minutes that haven't received a reminder,
    sends a push + in-app notification, and marks reminder_sent = True.
    """
    async with async_session_factory() as session:
        try:
            now = datetime.now(timezone.utc)
            window_start_dt = now + timedelta(minutes=55)
            window_end_dt = now + timedelta(minutes=65)

            # Build date+time filter. When the 10-minute window spans midnight the
            # start and end fall on different calendar dates, so we need OR logic.
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
                        Booking.reminder_sent == False,  # noqa: E712
                        date_time_filter,
                    )
                )
            )
            bookings = result.scalars().all()

            logger.info("Reminder check: found %d booking(s) due for reminder", len(bookings))

            for booking in bookings:
                salon_name = booking.salon.name if booking.salon else "le salon"
                await notify_booking_reminder(
                    db=session,
                    client_id=booking.client_id,
                    salon_name=salon_name,
                    booking_date=booking.booking_date,
                    start_time=booking.start_time,
                    booking_id=booking.id,
                )
                booking.reminder_sent = True

            await session.commit()
        except Exception:
            logger.exception("Reminder job failed")
            await session.rollback()
