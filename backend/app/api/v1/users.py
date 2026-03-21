from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.salon import Salon
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest, DeleteAccountRequest
from app.api.deps import get_current_user
from app.utils.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    current_user.password_hash = hash_password(data.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the current user's account. Requires password confirmation."""
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    today = datetime.now(timezone.utc).date()

    # Owner: check for future confirmed bookings from clients
    if current_user.role.value == "owner":
        result = await db.execute(
            select(Salon).where(Salon.owner_id == current_user.id)
        )
        salon = result.scalars().first()
        if salon:
            booking_result = await db.execute(
                select(Booking).where(
                    Booking.salon_id == salon.id,
                    Booking.status == BookingStatus.confirmed,
                    Booking.booking_date >= today,
                ).limit(1)
            )
            if booking_result.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot delete account while you have future bookings from clients. Please cancel or complete them first.",
                )

    # Client: cancel future confirmed bookings
    if current_user.role.value == "client":
        await db.execute(
            update(Booking)
            .where(
                Booking.client_id == current_user.id,
                Booking.status == BookingStatus.confirmed,
                Booking.booking_date >= today,
            )
            .values(status=BookingStatus.cancelled)
        )

    # Delete user — CASCADE handles all child records
    await db.delete(current_user)
    await db.flush()
