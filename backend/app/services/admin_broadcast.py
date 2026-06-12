import asyncio
import logging
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User, UserRole
from app.models.notification import Notification

logger = logging.getLogger(__name__)

_background_tasks: set[asyncio.Task] = set()


async def preview_audience(
    db: AsyncSession,
    *,
    role: str | None = None,
    language: str | None = None,
) -> dict:
    from sqlalchemy import func
    query = select(User).where(User.is_suspended == False)  # noqa: E712
    if role:
        try:
            query = query.where(User.role == UserRole(role))
        except ValueError:
            pass
    if language:
        query = query.where(User.language_pref == language)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    sample_result = await db.execute(query.limit(3))
    samples = sample_result.scalars().all()

    return {
        "count": total,
        "samples": [f"{u.first_name} {u.last_name}" for u in samples],
    }


async def send_broadcast(
    db: AsyncSession,
    *,
    admin_id: UUID,
    title_by_lang: dict[str, str],
    body_by_lang: dict[str, str],
    role: str | None = None,
    language: str | None = None,
) -> int:
    query = select(User).where(User.is_suspended == False)  # noqa: E712
    if role:
        try:
            query = query.where(User.role == UserRole(role))
        except ValueError:
            pass
    if language:
        query = query.where(User.language_pref == language)

    result = await db.execute(query)
    users = result.scalars().all()

    messages = []
    notif_rows = []

    for user in users:
        lang = user.language_pref if user.language_pref in title_by_lang else "fr"
        title = title_by_lang.get(lang, title_by_lang.get("fr", ""))
        body = body_by_lang.get(lang, body_by_lang.get("fr", ""))

        notif_rows.append(Notification(
            user_id=user.id,
            title=title,
            body=body,
            notif_type="broadcast",
            data={"admin_broadcast": True},
        ))
        for token in user.push_tokens:
            messages.append({
                "to": token.expo_token,
                "title": title,
                "body": body,
                "sound": "default",
                "channelId": "default",
                "priority": "high",
                "data": {"type": "broadcast"},
            })

    for notif in notif_rows:
        db.add(notif)
    await db.flush()

    if messages:
        task = asyncio.create_task(
            _fire_push_batch(messages),
            name=f"broadcast-{admin_id}",
        )
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    return len(users)


async def _fire_push_batch(messages: list[dict]) -> None:
    chunk_size = 100
    try:
        async with httpx.AsyncClient() as client:
            for i in range(0, len(messages), chunk_size):
                chunk = messages[i : i + chunk_size]
                resp = await client.post(
                    settings.EXPO_PUSH_URL,
                    json=chunk,
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                    timeout=15.0,
                )
                logger.info("Broadcast chunk %d — status %d", i // chunk_size + 1, resp.status_code)
    except Exception:
        logger.exception("Broadcast push failed")
