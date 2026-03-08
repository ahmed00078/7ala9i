from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.schemas.salon import SalonResponse


class FavoriteCreate(BaseModel):
    salon_id: UUID


class FavoriteResponse(BaseModel):
    id: UUID
    user_id: UUID
    salon_id: UUID
    created_at: datetime
    salon: SalonResponse | None = None

    model_config = {"from_attributes": True}
