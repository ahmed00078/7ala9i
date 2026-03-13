import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.push_token import PushToken
from app.schemas.notification import PushTokenCreate, PushTokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push-tokens", tags=["push-tokens"])


@router.post("", response_model=PushTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_push_token(
    data: PushTokenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if this exact token already exists for this user (upsert)
    result = await db.execute(
        select(PushToken).where(
            PushToken.user_id == current_user.id,
            PushToken.expo_token == data.expo_token,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Update platform if changed
        if data.platform and existing.platform != data.platform:
            existing.platform = data.platform
            await db.flush()
            await db.refresh(existing)
        return PushTokenResponse.model_validate(existing)

    token = PushToken(
        user_id=current_user.id,
        expo_token=data.expo_token,
        platform=data.platform,
    )
    db.add(token)
    await db.flush()
    await db.refresh(token)
    logger.info("Push token registered for user %s: %s", current_user.id, data.expo_token[:20])
    return PushTokenResponse.model_validate(token)


@router.get("/debug", summary="Check push tokens for current user")
async def debug_push_tokens(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PushToken).where(PushToken.user_id == current_user.id)
    )
    tokens = result.scalars().all()
    total = await db.execute(select(func.count()).select_from(PushToken))
    return {
        "user_id": str(current_user.id),
        "your_tokens": [
            {"expo_token": t.expo_token, "platform": t.platform, "created_at": str(t.created_at)}
            for t in tokens
        ],
        "total_tokens_in_db": total.scalar(),
    }
