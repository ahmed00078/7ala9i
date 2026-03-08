from uuid import UUID
from datetime import datetime, time
from pydantic import BaseModel


class SalonPhotoResponse(BaseModel):
    id: UUID
    photo_url: str
    sort_order: int

    model_config = {"from_attributes": True}


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
    is_active: bool

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


class SalonSearchParams(BaseModel):
    q: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    page: int = 1
    per_page: int = 20
