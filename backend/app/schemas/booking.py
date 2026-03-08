from uuid import UUID
from datetime import date, time, datetime
from pydantic import BaseModel


class BookingCreate(BaseModel):
    salon_id: UUID
    service_id: UUID
    booking_date: date
    start_time: time


class BookingReschedule(BaseModel):
    booking_date: date
    start_time: time


class BookingServiceResponse(BaseModel):
    id: UUID
    name: str
    name_ar: str | None = None
    price: int
    duration: int

    model_config = {"from_attributes": True}


class BookingSalonResponse(BaseModel):
    id: UUID
    name: str
    name_ar: str | None = None
    address: str | None = None
    phone: str | None = None
    cover_photo_url: str | None = None

    model_config = {"from_attributes": True}


class BookingClientResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone: str | None = None

    model_config = {"from_attributes": True}


class BookingResponse(BaseModel):
    id: UUID
    client_id: UUID
    salon_id: UUID
    service_id: UUID
    booking_date: date
    start_time: time
    end_time: time
    status: str
    total_price: int
    notes: str | None = None
    created_at: datetime
    service: BookingServiceResponse | None = None
    salon: BookingSalonResponse | None = None
    client: BookingClientResponse | None = None

    model_config = {"from_attributes": True}


class AvailabilityResponse(BaseModel):
    date: date
    slots: list[str]
