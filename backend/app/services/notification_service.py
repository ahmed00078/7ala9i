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
from app.models.user import User

logger = logging.getLogger(__name__)

# Strong references to fire-and-forget tasks so GC doesn't kill them
_background_tasks: set[asyncio.Task] = set()


# ---------------------------------------------------------------------------
# Translations — keyed by language → notif_type → {title, body}
# Body strings use Python str.format() placeholders.
# ---------------------------------------------------------------------------

TRANSLATIONS: dict[str, dict[str, dict[str, str]]] = {
    "ar": {
        "booking_confirmed": {
            "title": "تأكيد الحجز",
            "body": "تم تأكيد موعدك في {salon_name} يوم {booking_date} الساعة {time_str}.",
        },
        "booking_created": {
            "title": "حجز جديد",
            "body": "{client_first_name} حجز في {salon_name} يوم {booking_date} الساعة {time_str}.",
        },
        "booking_cancelled_by_client": {
            "title": "إلغاء الحجز",
            "body": "{client_first_name} ألغى موعده في {salon_name} يوم {booking_date} الساعة {time_str}.",
        },
        "booking_cancelled_by_owner": {
            "title": "إلغاء الحجز",
            "body": "تم إلغاء موعدك في {salon_name} يوم {booking_date} الساعة {time_str}.",
        },
        "booking_completed": {
            "title": "انتهى الموعد",
            "body": "انتهت زيارتك في {salon_name}. اترك تقييماً!",
        },
        "booking_no_show": {
            "title": "غياب",
            "body": "تم تسجيل غيابك عن موعدك في {salon_name}.",
        },
        "booking_rescheduled": {
            "title": "إعادة جدولة",
            "body": "{client_first_name} أعاد جدولة موعده في {salon_name} إلى {booking_date} الساعة {time_str}.",
        },
        "booking_reminder": {
            "title": "تذكير بالموعد",
            "body": "موعدك في {salon_name} بعد ساعة ({time_str}).",
        },
        "owner_approved": {
            "title": "تمت الموافقة",
            "body": "تهانينا! تمت الموافقة على صالونك '{salon_name}'.",
        },
        "owner_rejected": {
            "title": "رفض الطلب",
            "body": "تم رفض طلب تسجيلك. تواصل مع الدعم للمزيد من المعلومات.",
        },
        "new_review": {
            "title": "تقييم جديد",
            "body": "{client_name} أعطى صالونك {rating}★",
        },
    },
    "fr": {
        "booking_confirmed": {
            "title": "Réservation confirmée",
            "body": "Votre RDV chez {salon_name} le {booking_date} à {time_str} est confirmé.",
        },
        "booking_created": {
            "title": "Nouvelle réservation",
            "body": "{client_first_name} a réservé chez {salon_name} le {booking_date} à {time_str}.",
        },
        "booking_cancelled_by_client": {
            "title": "Réservation annulée",
            "body": "{client_first_name} a annulé son RDV chez {salon_name} le {booking_date} à {time_str}.",
        },
        "booking_cancelled_by_owner": {
            "title": "Réservation annulée",
            "body": "Votre RDV chez {salon_name} le {booking_date} à {time_str} a été annulé.",
        },
        "booking_completed": {
            "title": "RDV terminé",
            "body": "Votre visite chez {salon_name} est terminée. Laissez un avis !",
        },
        "booking_no_show": {
            "title": "Absence enregistrée",
            "body": "Votre RDV chez {salon_name} a été marqué comme absence.",
        },
        "booking_rescheduled": {
            "title": "RDV reprogrammé",
            "body": "{client_first_name} a reprogrammé son RDV chez {salon_name} au {booking_date} à {time_str}.",
        },
        "booking_reminder": {
            "title": "Rappel RDV",
            "body": "Votre RDV chez {salon_name} est dans 1 heure ({time_str}).",
        },
        "owner_approved": {
            "title": "Compte approuvé",
            "body": "Félicitations ! Votre salon '{salon_name}' a été approuvé.",
        },
        "owner_rejected": {
            "title": "Demande refusée",
            "body": "Votre demande d'inscription a été refusée. Contactez le support pour plus d'informations.",
        },
        "new_review": {
            "title": "Nouveau avis",
            "body": "{client_name} a donné {rating}★ à votre salon {salon_name}.",
        },
    },
    "en": {
        "booking_confirmed": {
            "title": "Booking Confirmed",
            "body": "Your appointment at {salon_name} on {booking_date} at {time_str} is confirmed.",
        },
        "booking_created": {
            "title": "New Booking",
            "body": "{client_first_name} booked at {salon_name} on {booking_date} at {time_str}.",
        },
        "booking_cancelled_by_client": {
            "title": "Booking Cancelled",
            "body": "{client_first_name} cancelled their appointment at {salon_name} on {booking_date} at {time_str}.",
        },
        "booking_cancelled_by_owner": {
            "title": "Booking Cancelled",
            "body": "Your appointment at {salon_name} on {booking_date} at {time_str} has been cancelled.",
        },
        "booking_completed": {
            "title": "Appointment Completed",
            "body": "Your visit at {salon_name} is done. Leave a review!",
        },
        "booking_no_show": {
            "title": "No Show",
            "body": "Your appointment at {salon_name} was marked as no-show.",
        },
        "booking_rescheduled": {
            "title": "Booking Rescheduled",
            "body": "{client_first_name} rescheduled their appointment at {salon_name} to {booking_date} at {time_str}.",
        },
        "booking_reminder": {
            "title": "Appointment Reminder",
            "body": "Your appointment at {salon_name} is in 1 hour ({time_str}).",
        },
        "owner_approved": {
            "title": "Account Approved",
            "body": "Congratulations! Your salon '{salon_name}' has been approved.",
        },
        "owner_rejected": {
            "title": "Application Rejected",
            "body": "Your registration request was rejected. Please contact support.",
        },
        "new_review": {
            "title": "New Review",
            "body": "{client_name} gave your salon {rating}★",
        },
    },
}


def _translate(lang: str, notif_type: str, fmt_kwargs: dict) -> tuple[str, str]:
    """Return (title, body) in the user's language, falling back to French."""
    translations = TRANSLATIONS.get(lang, TRANSLATIONS["fr"])
    entry = translations.get(notif_type, TRANSLATIONS["fr"].get(notif_type, {}))
    title = entry.get("title", notif_type)
    body_template = entry.get("body", "")
    try:
        body = body_template.format(**fmt_kwargs)
    except KeyError:
        body = body_template
    return title, body


async def _get_user_language(db: AsyncSession, user_id: UUID) -> str:
    """Fetch user's language_pref, defaulting to 'fr'."""
    result = await db.execute(
        select(User.language_pref).where(User.id == user_id)
    )
    lang = result.scalar_one_or_none()
    return lang or "fr"


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
# Event helpers — one per business event (now i18n-aware)
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
    lang = await _get_user_language(db, client_id)
    fmt = {"salon_name": salon_name, "booking_date": date_str, "time_str": time_str}
    title, body = _translate(lang, "booking_confirmed", fmt)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title=title,
        body=body,
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
    lang = await _get_user_language(db, owner_id)
    fmt = {"client_first_name": client_first_name, "salon_name": salon_name, "booking_date": date_str, "time_str": time_str}
    title, body = _translate(lang, "booking_created", fmt)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title=title,
        body=body,
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
    lang = await _get_user_language(db, owner_id)
    fmt = {"client_first_name": client_first_name, "salon_name": salon_name, "booking_date": date_str, "time_str": time_str}
    title, body = _translate(lang, "booking_cancelled_by_client", fmt)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title=title,
        body=body,
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
    lang = await _get_user_language(db, client_id)
    fmt = {"salon_name": salon_name, "booking_date": date_str, "time_str": time_str}
    title, body = _translate(lang, "booking_cancelled_by_owner", fmt)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title=title,
        body=body,
        notif_type="booking_cancelled_by_owner",
        data={"booking_id": str(booking_id), "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_booking_completed(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_id: UUID,
) -> None:
    lang = await _get_user_language(db, client_id)
    fmt = {"salon_name": salon_name}
    title, body = _translate(lang, "booking_completed", fmt)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title=title,
        body=body,
        notif_type="booking_completed",
        data={"booking_id": str(booking_id), "salon_name": salon_name},
    )


async def notify_booking_no_show(
    db: AsyncSession,
    client_id: UUID,
    salon_name: str,
    booking_id: UUID,
) -> None:
    lang = await _get_user_language(db, client_id)
    fmt = {"salon_name": salon_name}
    title, body = _translate(lang, "booking_no_show", fmt)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title=title,
        body=body,
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
    lang = await _get_user_language(db, owner_id)
    fmt = {"client_first_name": client_first_name, "salon_name": salon_name, "booking_date": date_str, "time_str": time_str}
    title, body = _translate(lang, "booking_rescheduled", fmt)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title=title,
        body=body,
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
    lang = await _get_user_language(db, client_id)
    fmt = {"salon_name": salon_name, "booking_date": date_str, "time_str": time_str}
    title, body = _translate(lang, "booking_reminder", fmt)
    await create_and_send_notification(
        db=db,
        user_id=client_id,
        title=title,
        body=body,
        notif_type="booking_reminder",
        data={"booking_id": str(booking_id), "salon_name": salon_name, "booking_date": date_str, "time_str": time_str},
    )


async def notify_owner_approved(
    db: AsyncSession,
    owner_id: UUID,
    salon_name: str,
) -> None:
    lang = await _get_user_language(db, owner_id)
    fmt = {"salon_name": salon_name}
    title, body = _translate(lang, "owner_approved", fmt)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title=title,
        body=body,
        notif_type="owner_approved",
        data={"salon_name": salon_name},
    )


async def notify_owner_rejected(
    db: AsyncSession,
    owner_id: UUID,
) -> None:
    lang = await _get_user_language(db, owner_id)
    title, body = _translate(lang, "owner_rejected", {})
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title=title,
        body=body,
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
    lang = await _get_user_language(db, owner_id)
    fmt = {"client_name": client_name, "salon_name": salon_name, "rating": rating}
    title, body = _translate(lang, "new_review", fmt)
    await create_and_send_notification(
        db=db,
        user_id=owner_id,
        title=title,
        body=body,
        notif_type="new_review",
        data={"review_id": str(review_id), "salon_id": str(salon_id), "rating": rating, "client_name": client_name},
    )
