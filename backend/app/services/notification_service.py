import asyncio
import logging
from uuid import UUID
from datetime import date, time

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.notification import Notification
from app.models.push_token import PushToken

logger = logging.getLogger(__name__)

# Strong references to fire-and-forget tasks so GC doesn't kill them
_background_tasks: set[asyncio.Task] = set()


# ---------------------------------------------------------------------------
# Low-level: send push via Expo Push API (uses its own session, fire-and-forget)
# ---------------------------------------------------------------------------

async def _send_push_for_user(user_id: UUID, title: str, body: str, data: dict | None = None) -> None:
    async with async_session_factory() as session:
        try:
            result = await session.execute(
                select(PushToken).where(PushToken.user_id == user_id)
            )
            tokens = result.scalars().all()
            if not tokens:
                logger.debug("No push tokens for user %s", user_id)
                return

            messages = []
            for token in tokens:
                msg: dict = {
                    "to": token.expo_token,
                    "title": title,
                    "body": body,
                    "sound": "default",
                    "channelId": "default",
                    "priority": "high",
                }
                if data:
                    msg["data"] = data
                messages.append(msg)

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    settings.EXPO_PUSH_URL,
                    json=messages,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    timeout=10.0,
                )

            logger.info(
                "Push sent for user %s — %d token(s), status %d",
                user_id, len(tokens), resp.status_code,
            )

            # Log per-ticket errors returned by Expo
            try:
                tickets = resp.json().get("data", [])
                for ticket in tickets:
                    if ticket.get("status") != "ok":
                        logger.warning("Expo ticket error: %s", ticket)
            except Exception:
                pass  # non-critical — response parsing only

        except Exception:
            logger.exception("Push notification failed for user %s", user_id)


# ---------------------------------------------------------------------------
# Central function: persist notification + fire-and-forget push
# ---------------------------------------------------------------------------

async def create_and_send_notification(
    db: AsyncSession,
    user_id: UUID,
    title: str,
    body: str,
    notif_type: str,
    data: dict | None = None,
) -> None:
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        notif_type=notif_type,
        data=data,
    )
    db.add(notif)
    await db.flush()
    # Fire-and-forget push (non-blocking; uses its own DB session)
    task = asyncio.create_task(
        _send_push_for_user(user_id, title, body, data),
        name=f"push-{user_id}",
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# ---------------------------------------------------------------------------
# Event helpers — one per business event
# ---------------------------------------------------------------------------

async def notify_booking_confirmed(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_date: date,
    start_time: time,
    booking_id: UUID,
) -> None:
    time_str = start_time.strftime("%H:%M")
    date_str = str(booking_date)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title="Réservation confirmée",
        body=f"Votre RDV chez {salon_name} le {date_str} à {time_str} est confirmé.",
        notif_type="booking_confirmed",
        data={"booking_id": str(booking_id), "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_owner_new_booking(
    db: AsyncSession,
    owner_id: UUID,
    client_first_name: str,
    salon_name: str,
    booking_date: date,
    start_time: time,
    booking_id: UUID,
) -> None:
    time_str = start_time.strftime("%H:%M")
    date_str = str(booking_date)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title="Nouvelle réservation",
        body=f"{client_first_name} a réservé chez {salon_name} le {date_str} à {time_str}.",
        notif_type="booking_created",
        data={"booking_id": str(booking_id), "client_first_name": client_first_name, "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_booking_cancelled_by_client(
    db: AsyncSession,
    owner_id: UUID,
    client_first_name: str,
    salon_name: str,
    booking_date: date,
    start_time: time,
    booking_id: UUID,
) -> None:
    time_str = start_time.strftime("%H:%M")
    date_str = str(booking_date)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title="Réservation annulée",
        body=f"{client_first_name} a annulé son RDV chez {salon_name} le {date_str} à {time_str}.",
        notif_type="booking_cancelled_by_client",
        data={"booking_id": str(booking_id), "client_first_name": client_first_name, "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_booking_cancelled_by_owner(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_date: date,
    start_time: time,
    booking_id: UUID,
) -> None:
    time_str = start_time.strftime("%H:%M")
    date_str = str(booking_date)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title="Réservation annulée",
        body=f"Votre RDV chez {salon_name} le {date_str} à {time_str} a été annulé.",
        notif_type="booking_cancelled_by_owner",
        data={"booking_id": str(booking_id), "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_booking_completed(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_id: UUID,
) -> None:
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title="RDV terminé",
        body=f"Votre visite chez {salon_name} est terminée. Laissez un avis !",
        notif_type="booking_completed",
        data={"booking_id": str(booking_id), "salon_name": salon_name},
    )


async def notify_booking_no_show(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_id: UUID,
) -> None:
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title="Absence enregistrée",
        body=f"Votre RDV chez {salon_name} a été marqué comme absence.",
        notif_type="booking_no_show",
        data={"booking_id": str(booking_id), "salon_name": salon_name},
    )


async def notify_booking_rescheduled(
    db: AsyncSession,
    owner_id: UUID,
    client_first_name: str,
    salon_name: str,
    booking_date: date,
    start_time: time,
    booking_id: UUID,
) -> None:
    time_str = start_time.strftime("%H:%M")
    date_str = str(booking_date)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title="RDV reprogrammé",
        body=f"{client_first_name} a reprogrammé son RDV chez {salon_name} au {date_str} à {time_str}.",
        notif_type="booking_rescheduled",
        data={"booking_id": str(booking_id), "client_first_name": client_first_name, "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_booking_reminder(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_date: date,
    start_time: time,
    booking_id: UUID,
) -> None:
    time_str = start_time.strftime("%H:%M")
    date_str = str(booking_date)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title="Rappel RDV",
        body=f"Votre RDV chez {salon_name} est dans 1 heure ({time_str}).",
        notif_type="booking_reminder",
        data={"booking_id": str(booking_id), "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_owner_approved(
    db: AsyncSession,
    owner_id: UUID,
    salon_name: str,
) -> None:
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title="Compte approuvé",
        body=f"Félicitations ! Votre salon '{salon_name}' a été approuvé. Vous pouvez maintenant vous connecter.",
        notif_type="owner_approved",
        data={"salon_name": salon_name},
    )


async def notify_owner_rejected(
    db: AsyncSession,
    owner_id: UUID,
) -> None:
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title="Demande refusée",
        body="Votre demande d'inscription a été refusée. Contactez le support pour plus d'informations.",
        notif_type="owner_rejected",
        data={},
    )


async def notify_new_review(
    db: AsyncSession,
    owner_id: UUID,
    client_name: str,
    salon_name: str,
    rating: int,
    review_id: UUID,
    salon_id: UUID,
) -> None:
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title="Nouveau avis",
        body=f"{client_name} a donné {rating}★ à votre salon {salon_name}.",
        notif_type="new_review",
        data={"review_id": str(review_id), "salon_id": str(salon_id), "rating": rating, "client_name": client_name},
    )
