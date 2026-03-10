from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.models.salon import Salon
from app.models.user import User
from app.services.notification_service import notify_booking_reminder


async def send_upcoming_reminders() -> None:
    """
    Called every 5 minutes by APScheduler.
    Finds confirmed bookings starting in 55–65 minutes that haven't received a reminder,
    sends a push + in-app notification, and marks reminder_sent = True.
    """
    async with async_session_factory() as session:
        try:
            now = datetime.now(timezone.utc)
            today = now.date()
            window_start = (now + timedelta(minutes=55)).time()
            window_end = (now + timedelta(minutes=65)).time()

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
                        Booking.booking_date == today,
                        Booking.start_time >= window_start,
                        Booking.start_time <= window_end,
                    )
                )
            )
            bookings = result.scalars().all()

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
            await session.rollback()
