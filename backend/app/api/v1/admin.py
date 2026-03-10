from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.salon import Salon
from app.models.booking import Booking
from app.models.working_hours import WorkingHours
from app.utils.security import hash_password
from app.schemas.user import UserResponse
from app.api.deps import require_role
from app.services.notification_service import notify_owner_approved, notify_owner_rejected

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

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


class ApproveOwnerRequest(BaseModel):
    salon_name: str
    salon_name_ar: str | None = None
    address: str | None = None
    city: str = "Nouakchott"
    salon_phone: str | None = None


class OwnerSummary(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: str | None
    is_approved: bool
    created_at: str
    salon_id: str | None = None
    salon_name: str | None = None
    total_bookings: int = 0


class AdminStats(BaseModel):
    total_clients: int
    total_owners: int
    pending_owners: int
    total_salons: int
    total_bookings: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_default_working_hours(db: AsyncSession, salon_id: UUID):
    for day in range(7):
        is_closed = day == 4  # Friday
        wh = WorkingHours(
            salon_id=salon_id,
            day_of_week=day,
            open_time=time(9, 0),
            close_time=time(21, 0),
            is_closed=is_closed,
        )
        db.add(wh)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Overall system statistics for the admin dashboard."""
    total_clients = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.client)
    )).scalar_one()

    total_owners = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.owner)
    )).scalar_one()

    pending_owners = (await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.owner,
            User.is_approved == False,  # noqa: E712
        )
    )).scalar_one()

    total_salons = (await db.execute(
        select(func.count(Salon.id))
    )).scalar_one()

    total_bookings = (await db.execute(
        select(func.count(Booking.id))
    )).scalar_one()

    return AdminStats(
        total_clients=total_clients,
        total_owners=total_owners,
        pending_owners=pending_owners,
        total_salons=total_salons,
        total_bookings=total_bookings,
    )


@router.get("/owners", response_model=list[OwnerSummary])
async def list_owners(
    pending_only: bool = False,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """List all owners. Pass ?pending_only=true to filter pending applications."""
    query = select(User).where(User.role == UserRole.owner)
    if pending_only:
        query = query.where(User.is_approved == False)  # noqa: E712
    query = query.order_by(User.created_at.desc())

    result = await db.execute(query)
    owners = result.scalars().all()

    summaries = []
    for owner in owners:
        salon_result = await db.execute(
            select(Salon).where(Salon.owner_id == owner.id)
        )
        salon = salon_result.scalar_one_or_none()

        bookings_count = 0
        if salon:
            bookings_count = (await db.execute(
                select(func.count(Booking.id)).where(Booking.salon_id == salon.id)
            )).scalar_one()

        summaries.append(OwnerSummary(
            id=str(owner.id),
            email=owner.email,
            first_name=owner.first_name,
            last_name=owner.last_name,
            phone=owner.phone,
            is_approved=owner.is_approved,
            created_at=owner.created_at.isoformat(),
            salon_id=str(salon.id) if salon else None,
            salon_name=salon.name if salon else None,
            total_bookings=bookings_count,
        ))

    return summaries


@router.post("/owners/{owner_id}/approve", response_model=CreateOwnerResponse)
async def approve_owner(
    owner_id: UUID,
    data: ApproveOwnerRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending owner application and create their salon."""
    result = await db.execute(
        select(User).where(User.id == owner_id, User.role == UserRole.owner)
    )
    owner = result.scalar_one_or_none()

    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
    if owner.is_approved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner already approved")

    salon_check = await db.execute(select(Salon).where(Salon.owner_id == owner.id))
    if salon_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner already has a salon")

    owner.is_approved = True

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

    await _create_default_working_hours(db, salon.id)
    await db.flush()
    await db.refresh(owner)

    try:
        await notify_owner_approved(db, owner.id, data.salon_name)
    except Exception:
        pass

    return CreateOwnerResponse(
        user=UserResponse.model_validate(owner),
        salon_id=str(salon.id),
    )


@router.delete("/owners/{owner_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_owner(
    owner_id: UUID,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Reject and delete a pending owner application."""
    result = await db.execute(
        select(User).where(User.id == owner_id, User.role == UserRole.owner)
    )
    owner = result.scalar_one_or_none()

    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")
    if owner.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject an already approved owner",
        )

    # Notify owner before deleting (push fires async; DB notification cascades with user delete)
    try:
        await notify_owner_rejected(db, owner.id)
    except Exception:
        pass

    await db.delete(owner)


@router.post("/owners", response_model=CreateOwnerResponse, status_code=201)
async def create_owner(
    data: CreateOwnerRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Admin directly creates a fully-approved owner with a salon (bypasses the application flow)."""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    owner = User(
        email=data.email,
        password_hash=hash_password(data.password),
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.owner,
        is_approved=True,
    )
    db.add(owner)
    await db.flush()

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

    await _create_default_working_hours(db, salon.id)
    await db.flush()
    await db.refresh(owner)

    return CreateOwnerResponse(
        user=UserResponse.model_validate(owner),
        salon_id=str(salon.id),
    )
