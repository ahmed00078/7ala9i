import logging
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
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


@app.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>7ala9i – Privacy Policy</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#333;line-height:1.7}
  h1{color:#0D9488}h2{color:#0F1923;margin-top:28px}
</style>
</head>
<body>
<h1>7ala9i (&#1581;&#1604;&#1575;&#1602;&#1610;) – Privacy Policy</h1>
<p><strong>Last updated:</strong> March 2026</p>

<h2>1. Information We Collect</h2>
<p>When you create an account we collect your <strong>name, email address, and phone number</strong>.
When you book an appointment we store the <strong>booking date, time, and selected service</strong>.
We also collect your <strong>Expo push token</strong> to send appointment reminders.</p>

<h2>2. How We Use Your Information</h2>
<ul>
<li>To create and manage your account</li>
<li>To process and manage your bookings</li>
<li>To send appointment reminders and notifications</li>
<li>To display reviews you have submitted</li>
</ul>

<h2>3. Data Sharing</h2>
<p>We do <strong>not</strong> sell or share your personal data with third parties.
Salon owners can see your name and booking details for appointments you make at their salon.</p>

<h2>4. Data Storage &amp; Security</h2>
<p>Your data is stored on secure servers. Passwords are hashed with bcrypt and never stored in plain text.
API communication is encrypted via HTTPS.</p>

<h2>5. Your Rights</h2>
<p>You can view and update your profile information at any time within the app.
To request deletion of your account and associated data, contact us at the email below.</p>

<h2>6. Push Notifications</h2>
<p>We send push notifications for appointment reminders. You can disable notifications in your device settings at any time.</p>

<h2>7. Contact</h2>
<p>For questions about this privacy policy, contact us at: <strong>contact@halagi.mr</strong></p>
</body>
</html>"""
