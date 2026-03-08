import math
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.salon import Salon, SalonPhoto
from app.models.service import ServiceCategory, Service
from app.models.working_hours import WorkingHours
from app.models.review import Review
from app.schemas.salon import (
    SalonResponse,
    SalonDetailResponse,
    ServiceCategoryInSalonResponse,
    WorkingHoursResponse,
    SalonPhotoResponse,
)
from app.schemas.review import ReviewResponse
from app.schemas.booking import AvailabilityResponse
from app.utils.time_slots import get_available_slots

router = APIRouter(prefix="/salons", tags=["salons"])


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/", response_model=list[SalonResponse])
async def search_salons(
    q: str | None = Query(None, description="Search query"),
    city: str | None = Query(None, description="Filter by city"),
    lat: float | None = Query(None, description="User latitude"),
    lng: float | None = Query(None, description="User longitude"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Salon).where(Salon.is_active == True)

    if q:
        search_term = f"%{q}%"
        query = query.where(
            or_(
                Salon.name.ilike(search_term),
                Salon.name_ar.ilike(search_term),
                Salon.description.ilike(search_term),
                Salon.address.ilike(search_term),
            )
        )

    if city:
        query = query.where(Salon.city.ilike(f"%{city}%"))

    result = await db.execute(query)
    salons = list(result.scalars().all())

    # Sort by proximity if lat/lng provided
    if lat is not None and lng is not None:
        salons_with_distance = []
        for salon in salons:
            if salon.lat is not None and salon.lng is not None:
                dist = haversine_distance(lat, lng, salon.lat, salon.lng)
            else:
                dist = float("inf")
            salons_with_distance.append((salon, dist))
        salons_with_distance.sort(key=lambda x: x[1])
        salons = [s for s, _ in salons_with_distance]
    else:
        # Default sort by rating
        salons.sort(key=lambda s: s.avg_rating, reverse=True)

    # Paginate
    offset = (page - 1) * per_page
    salons = salons[offset : offset + per_page]

    return [SalonResponse.model_validate(s) for s in salons]


@router.get("/{salon_id}", response_model=SalonDetailResponse)
async def get_salon_detail(
    salon_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Salon)
        .options(
            selectinload(Salon.photos),
            selectinload(Salon.service_categories).selectinload(ServiceCategory.services),
            selectinload(Salon.working_hours),
        )
        .where(Salon.id == salon_id)
    )
    salon = result.scalar_one_or_none()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    return SalonDetailResponse.model_validate(salon)


@router.get("/{salon_id}/reviews", response_model=list[ReviewResponse])
async def get_salon_reviews(
    salon_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Verify salon exists
    result = await db.execute(select(Salon).where(Salon.id == salon_id))
    salon = result.scalar_one_or_none()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Review)
        .where(Review.salon_id == salon_id)
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    reviews = result.scalars().all()

    return [ReviewResponse.model_validate(r) for r in reviews]


@router.get("/{salon_id}/availability", response_model=AvailabilityResponse)
async def get_availability(
    salon_id: UUID,
    date: date = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    service_id: UUID = Query(..., description="Service ID"),
    db: AsyncSession = Depends(get_db),
):
    # Verify salon exists
    result = await db.execute(select(Salon).where(Salon.id == salon_id))
    salon = result.scalar_one_or_none()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    slots = await get_available_slots(db, salon_id, service_id, date)

    return AvailabilityResponse(date=date, slots=slots)
