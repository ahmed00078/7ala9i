from uuid import UUID
from datetime import datetime, time
from pydantic import BaseModel, field_validator


class SalonPhotoResponse(BaseModel):
    id: UUID
    photo_url: str
    sort_order: int

    model_config = {"from_attributes": True}


class SalonPhotoReorder(BaseModel):
    photo_ids: list[UUID]


class WorkingHoursResponse(BaseModel):
    id: UUID
    day_of_week: int
    open_time: time
    close_time: time
    is_closed: bool

    model_config = {"from_attributes": True}


class WorkingHoursUpdate(BaseModel):
    day_of_week: int
    open_time: time
    close_time: time
    is_closed: bool


class WorkingHoursBulkUpdate(BaseModel):
    hours: list[WorkingHoursUpdate]


class SalonResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    name_ar: str | None = None
    address: str | None = None
    city: str
    lat: float | None = None
    lng: float | None = None
    phone: str | None = None
    avg_rating: float
    total_reviews: int
    cover_photo_url: str | None = None
    distance_km: float | None = None
    is_active: bool
    is_open_now: bool | None = None
    closes_at: time | None = None
    min_service_price: int | None = None

    model_config = {"from_attributes": True}


class ServiceInSalonResponse(BaseModel):
    id: UUID
    name: str
    name_ar: str | None = None
    price: int
    duration: int
    is_active: bool

    model_config = {"from_attributes": True}


class ServiceCategoryInSalonResponse(BaseModel):
    id: UUID
    name: str
    name_ar: str | None = None
    sort_order: int
    services: list[ServiceInSalonResponse] = []

    model_config = {"from_attributes": True}


class SalonDetailResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    name_ar: str | None = None
    description: str | None = None
    description_ar: str | None = None
    address: str | None = None
    city: str
    lat: float | None = None
    lng: float | None = None
    phone: str | None = None
    avg_rating: float
    total_reviews: int
    cover_photo_url: str | None = None
    is_active: bool
    photos: list[SalonPhotoResponse] = []
    service_categories: list[ServiceCategoryInSalonResponse] = []
    working_hours: list[WorkingHoursResponse] = []

    model_config = {"from_attributes": True}


class SalonUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    description: str | None = None
    description_ar: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    lat: float | None = None
    lng: float | None = None

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if value < -90 or value > 90:
            raise ValueError("Latitude must be between -90 and 90")
        return value

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if value < -180 or value > 180:
            raise ValueError("Longitude must be between -180 and 180")
        return value


class SalonSearchParams(BaseModel):
    q: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    radius_km: float | None = None
    with_distance: bool = False
    page: int = 1
    per_page: int = 20
