from uuid import UUID
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    title: str
    body: str
    notif_type: str
    data: dict[str, Any] | None = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PushTokenCreate(BaseModel):
    expo_token: str
    platform: str | None = None


class PushTokenResponse(BaseModel):
    id: UUID
    expo_token: str
    platform: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
