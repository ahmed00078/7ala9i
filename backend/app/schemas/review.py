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
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class ReviewReplyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ReviewResponse(BaseModel):
    id: UUID
    client_id: UUID
    salon_id: UUID
    booking_id: UUID
    rating: int
    comment: str | None = None
    owner_reply: str | None = None
    owner_reply_at: datetime | None = None
    created_at: datetime
    client: ReviewClientResponse | None = None

    model_config = {"from_attributes": True}
