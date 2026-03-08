from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.working_hours import WorkingHours
from app.utils.security import hash_password
from app.schemas.user import UserResponse
from app.api.deps import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateOwnerRequest(BaseModel):
    email: EmailStr
    password: str
    phone: str | None = None
    first_name: str
    last_name: str
    salon_name: str
    salon_name_ar: str | None = None
    address: str | None = None
    city: str = "Nouakchott"
    salon_phone: str | None = None


class CreateOwnerResponse(BaseModel):
    user: UserResponse
    salon_id: str


@router.post("/owners", response_model=CreateOwnerResponse, status_code=201)
async def create_owner(
    data: CreateOwnerRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create owner user
    owner = User(
        email=data.email,
        password_hash=hash_password(data.password),
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.owner,
    )
    db.add(owner)
    await db.flush()

    # Create salon
    salon = Salon(
        owner_id=owner.id,
        name=data.salon_name,
        name_ar=data.salon_name_ar,
        address=data.address,
        city=data.city,
        phone=data.salon_phone,
    )
    db.add(salon)
    await db.flush()

    # Create default working hours (closed Friday, open Sat-Thu 9:00-21:00)
    from datetime import time

    for day in range(7):
        is_closed = day == 4  # Friday
        wh = WorkingHours(
            salon_id=salon.id,
            day_of_week=day,
            open_time=time(9, 0),
            close_time=time(21, 0),
            is_closed=is_closed,
        )
        db.add(wh)

    await db.flush()
    await db.refresh(owner)

    return CreateOwnerResponse(
        user=UserResponse.model_validate(owner),
        salon_id=str(salon.id),
    )
