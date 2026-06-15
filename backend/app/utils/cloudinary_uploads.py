"""Image upload helpers shared between owner (salon photos) and users (avatars).

Cloudinary is the production destination; falls back to local /uploads/ for dev
when CLOUDINARY_CLOUD_NAME is not configured. Local files are served via the
StaticFiles mount in app.main.
"""
from __future__ import annotations

import io
import os
import uuid

import cloudinary
import cloudinary.uploader

from app.config import settings


# Configured once at import time. Safe no-op when env vars are absent.
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def normalize_image_extension(filename: str | None) -> str:
    """Pick a safe extension from an UploadFile filename, defaulting to jpg."""
    if not filename or "." not in filename:
        return "jpg"
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext if ext in ALLOWED_IMAGE_EXTENSIONS else "jpg"


def store_image(content: bytes, filename: str, folder: str) -> str:
    """Persist image bytes and return the URL the frontend should display.

    `folder` is the Cloudinary folder ("halagi/salons", "halagi/users"); the
    local fallback writes flat into /uploads/ regardless and serves at
    /uploads/<filename> via the StaticFiles mount.
    """
    if settings.CLOUDINARY_CLOUD_NAME:
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            folder=folder,
            public_id=filename.rsplit(".", 1)[0],
            overwrite=True,
            resource_type="image",
        )
        return result["secure_url"]

    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as fh:
        fh.write(content)
    return f"/uploads/{filename}"


def delete_image(image_url: str | None) -> None:
    """Best-effort removal of a previously stored image (Cloudinary only)."""
    if not image_url or "/upload/" not in image_url:
        return
    try:
        parts = image_url.split("/upload/")
        path = parts[1].split("/", 1)[1] if "/" in parts[1] else parts[1]
        public_id = path.rsplit(".", 1)[0]
        cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception:
        pass


def generate_image_filename(original_filename: str | None) -> str:
    """UUID filename with a safe extension derived from the upload."""
    return f"{uuid.uuid4()}.{normalize_image_extension(original_filename)}"
