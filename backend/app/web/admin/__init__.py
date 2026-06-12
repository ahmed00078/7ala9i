from fastapi import APIRouter

from app.web.admin import auth, dashboard, owners, salons, clients, bookings, reviews, broadcasts, analytics, audit

router = APIRouter()

router.include_router(auth.router)
router.include_router(dashboard.router)
router.include_router(owners.router)
router.include_router(salons.router)
router.include_router(clients.router)
router.include_router(bookings.router)
router.include_router(reviews.router)
router.include_router(broadcasts.router)
router.include_router(analytics.router)
router.include_router(audit.router)
