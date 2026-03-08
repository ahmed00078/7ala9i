from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.booking import Booking
from app.models.push_token import PushToken
from app.models.salon import Salon


async def send_push_notification(
    db: AsyncSession,
    user_id: UUID,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    result = await db.execute(
        select(PushToken).where(PushToken.user_id == user_id)
    )
    tokens = result.scalars().all()

    if not tokens:
        return False

    messages = []
    for token in tokens:
        message = {
            "to": token.expo_token,
            "title": title,
            "body": body,
            "sound": "default",
        }
        if data:
            message["data"] = data
        messages.append(message)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.EXPO_PUSH_URL,
            json=messages,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        return response.status_code == 200


async def notify_booking_confirmed(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_date: str,
    start_time: str,
):
    await send_push_notification(
        db=db,
        user_id=client_id,
        title="Booking Confirmed",
        body=f"Your appointment at {salon_name} on {booking_date} at {start_time} is confirmed.",
        data={"type": "booking_confirmed"},
    )


async def notify_booking_cancelled(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_date: str,
    start_time: str,
):
    await send_push_notification(
        db=db,
        user_id=client_id,
        title="Booking Cancelled",
        body=f"Your appointment at {salon_name} on {booking_date} at {start_time} has been cancelled.",
        data={"type": "booking_cancelled"},
    )


async def send_booking_notification(db: AsyncSession, booking: Booking) -> None:
    """Notify the salon owner when a new booking is created."""
    result = await db.execute(select(Salon).where(Salon.id == booking.salon_id))
    salon = result.scalar_one_or_none()
    if not salon:
        return

    await send_push_notification(
        db=db,
        user_id=salon.owner_id,
        title="New Booking",
        body=(
            f"New appointment at {salon.name} on "
            f"{booking.booking_date} at {booking.start_time.strftime('%H:%M')}."
        ),
        data={"type": "new_booking", "booking_id": str(booking.id)},
    )
