import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.phone_verification import PhoneVerification

logger = logging.getLogger(__name__)

_CHINGUISOFT_BASE = "https://chinguisoft.com/api/sms/validation"
_OTP_TTL_MINUTES = 10


def _normalize_phone(phone: str) -> str:
    """Strip leading + and optional 222 country code, return raw 8 digits."""
    digits = phone.lstrip("+")
    if digits.startswith("222"):
        digits = digits[3:]
    return digits


def _map_language(lang: str) -> str:
    if lang == "ar":
        return "ar"
    return "fr"


async def send_otp(db: AsyncSession, phone: str, language: str = "fr") -> None:
    """Send OTP via Chinguisoft and persist the code. Raises HTTPException on failure."""
    normalized = _normalize_phone(phone)
    lang = _map_language(language)

    headers: dict[str, str] = {}
    if settings.CHINGUISOFT_VALIDATION_TOKEN:
        headers["Validation-token"] = settings.CHINGUISOFT_VALIDATION_TOKEN

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{_CHINGUISOFT_BASE}/{settings.CHINGUISOFT_VALIDATION_KEY}",
                json={"phone": normalized, "lang": lang},
                headers=headers,
            )
    except httpx.RequestError as exc:
        logger.error("Chinguisoft network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service unavailable",
        )

    if resp.status_code == 401:
        logger.error("Chinguisoft 401 — invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMS configuration error",
        )
    if resp.status_code == 402:
        logger.error("Chinguisoft 402 — insufficient balance")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service temporarily unavailable",
        )
    if resp.status_code == 429:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many SMS requests. Please wait before retrying.",
        )
    if resp.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service unavailable",
        )
    if resp.status_code != 200:
        logger.error("Chinguisoft unexpected status %d: %s", resp.status_code, resp.text)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service error",
        )

    try:
        code = resp.json()["code"]
    except (KeyError, ValueError) as exc:
        logger.error("Chinguisoft unexpected response: %s — %s", resp.text, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service error",
        )

    # Invalidate previous unused codes for this phone
    await db.execute(
        update(PhoneVerification)
        .where(PhoneVerification.phone == phone, PhoneVerification.is_used == False)  # noqa: E712
        .values(is_used=True)
    )

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=_OTP_TTL_MINUTES)
    db.add(PhoneVerification(phone=phone, code=str(code), expires_at=expires_at))
    await db.flush()


async def verify_otp(db: AsyncSession, phone: str, code: str) -> bool:
    """Return True and mark code used if valid; False otherwise."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(PhoneVerification)
        .where(
            PhoneVerification.phone == phone,
            PhoneVerification.is_used == False,  # noqa: E712
            PhoneVerification.expires_at > now,
        )
        .order_by(PhoneVerification.created_at.desc())
        .limit(1)
    )
    record = result.scalars().first()
    if not record or record.code != code:
        return False

    record.is_used = True
    await db.flush()
    return True
