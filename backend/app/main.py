import logging
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import engine, Base
from app.models import *  # noqa: F401, F403 — ensure all models are loaded
from app.services.reminder_service import send_upcoming_reminders

scheduler = AsyncIOScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    scheduler.add_job(send_upcoming_reminders, "interval", minutes=5, id="reminder_job", replace_existing=True)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title="7ala9i API",
    description="Barber Booking App for Mauritania",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.api.v1.auth import router as auth_router
from app.api.v1.salons import router as salons_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.favorites import router as favorites_router
from app.api.v1.users import router as users_router
from app.api.v1.owner import router as owner_router
from app.api.v1.admin import router as admin_router
from app.api.v1.push_tokens import router as push_tokens_router
from app.api.v1.notifications import router as notifications_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(salons_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(owner_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(push_tokens_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")

# Serve uploaded photos as static files
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "7ala9i"}
