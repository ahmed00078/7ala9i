from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    booking_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewClientResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class ReviewResponse(BaseModel):
    id: UUID
    client_id: UUID
    salon_id: UUID
    booking_id: UUID
    rating: int
    comment: str | None = None
    created_at: datetime
    client: ReviewClientResponse | None = None

    model_config = {"from_attributes": True}
