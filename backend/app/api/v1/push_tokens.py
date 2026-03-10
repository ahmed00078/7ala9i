from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.push_token import PushToken
from app.schemas.notification import PushTokenCreate, PushTokenResponse

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
    return PushTokenResponse.model_validate(token)
