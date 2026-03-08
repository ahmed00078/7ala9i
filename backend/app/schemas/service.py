from uuid import UUID
from pydantic import BaseModel


class ServiceCategoryCreate(BaseModel):
    name: str
    name_ar: str | None = None
    sort_order: int = 0


class ServiceCategoryUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    sort_order: int | None = None


class ServiceCategoryResponse(BaseModel):
    id: UUID
    salon_id: UUID
    name: str
    name_ar: str | None = None
    sort_order: int

    model_config = {"from_attributes": True}


class ServiceCreate(BaseModel):
    category_id: UUID
    name: str
    name_ar: str | None = None
    price: int
    duration: int
    is_active: bool = True


class ServiceUpdate(BaseModel):
    category_id: UUID | None = None
    name: str | None = None
    name_ar: str | None = None
    price: int | None = None
    duration: int | None = None
    is_active: bool | None = None


class ServiceResponse(BaseModel):
    id: UUID
    category_id: UUID
    salon_id: UUID
    name: str
    name_ar: str | None = None
    price: int
    duration: int
    is_active: bool

    model_config = {"from_attributes": True}
