from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, field_validator, model_validator


_MAX_CLOSURE_DAYS = 90


class ClosureCreate(BaseModel):
    start_at: datetime
    end_at: datetime
    reason: str | None = Field(default=None, max_length=140)

    @model_validator(mode="after")
    def _validate_range(self) -> "ClosureCreate":
        if self.end_at <= self.start_at:
            raise ValueError("end_at must be after start_at")
        if self.end_at - self.start_at > timedelta(days=_MAX_CLOSURE_DAYS):
            raise ValueError(f"Closure cannot exceed {_MAX_CLOSURE_DAYS} days")
        return self


class ClosureUpdate(BaseModel):
    start_at: datetime | None = None
    end_at: datetime | None = None
    reason: str | None = Field(default=None, max_length=140)


class ClosureResponse(BaseModel):
    id: UUID
    salon_id: UUID
    start_at: datetime
    end_at: datetime
    reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
