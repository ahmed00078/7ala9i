import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

logger = logging.getLogger(__name__)
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.phone_verification import PhoneVerification
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    RefreshRequest,
    RegisterResponse,
    OTPVerifyRequest,
    OTPResendRequest,
    OTPVerifyResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyResetCodeRequest,
)
from app.services.sms_service import send_otp, verify_otp, check_otp_valid
from app.utils.rate_limit import register_limiter
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_RESEND_COOLDOWN_SECONDS = 60


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, data: UserCreate, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    if not register_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later.",
        )
    # Block admin self-registration
    if data.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot self-register as admin",
        )

    # Only allow client or owner roles
    if data.role not in ("client", "owner"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'client' or 'owner'",
        )

    # Check if phone already exists
    result = await db.execute(select(User).where(User.phone == data.phone))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    is_owner = data.role == "owner"

    user = User(
        phone=data.phone,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.owner if is_owner else UserRole.client,
        is_approved=not is_owner,  # owners start as pending
        is_phone_verified=False,
        language_pref=data.language,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Send OTP — both clients and owners must verify before getting tokens
    await send_otp(db, data.phone, data.language)

    return RegisterResponse(
        user=UserResponse.model_validate(user),
        requires_verification=True,
        is_pending=is_owner,
        message=(
            "Votre demande a bien été reçue. Vérifiez votre téléphone pour continuer."
            if is_owner
            else None
        ),
    )


@router.post("/verify-otp", response_model=OTPVerifyResponse)
async def verify_otp_endpoint(data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone already verified",
        )

    valid = await verify_otp(db, data.phone, data.code)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_otp",
        )

    user.is_phone_verified = True
    await db.flush()

    if user.role == UserRole.owner:
        return OTPVerifyResponse(
            user=UserResponse.model_validate(user),
            is_pending=True,
            message="Votre demande a bien été reçue. Nous allons examiner votre dossier et vous contacter dans les meilleurs délais.",
        )

    # Client — issue tokens
    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)

    return OTPVerifyResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
        is_pending=False,
    )


@router.post("/resend-otp")
async def resend_otp(data: OTPResendRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone already verified",
        )

    # Cooldown check: look at last PhoneVerification created_at
    last_result = await db.execute(
        select(PhoneVerification)
        .where(PhoneVerification.phone == data.phone)
        .order_by(PhoneVerification.created_at.desc())
        .limit(1)
    )
    last = last_result.scalars().first()
    if last:
        elapsed = (datetime.now(timezone.utc) - last.created_at).total_seconds()
        if elapsed < _RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(_RESEND_COOLDOWN_SECONDS - elapsed)} seconds before resending",
            )

    await send_otp(db, data.phone, data.language)
    return {"message": "OTP sent"}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            or_(User.email == data.identifier, User.phone == data.identifier)
        )
    )
    user = result.scalars().first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password",
        )

    if not user.is_phone_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="phone_not_verified",
        )

    if user.role.value == "owner" and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval. We will contact you shortly.",
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support.",
        )

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(user.id, user.role.value)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP for password reset. Always returns 200 to avoid leaking phone existence."""
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalars().first()

    if user:
        # Cooldown: skip sending if a reset OTP was already dispatched within 60 s.
        # Returning 200 regardless avoids leaking whether the phone is registered.
        last_result = await db.execute(
            select(PhoneVerification)
            .where(
                PhoneVerification.phone == data.phone,
                PhoneVerification.purpose == "password_reset",
            )
            .order_by(PhoneVerification.created_at.desc())
            .limit(1)
        )
        last = last_result.scalars().first()
        cooldown_elapsed = (
            (datetime.now(timezone.utc) - last.created_at).total_seconds()
            if last
            else _RESEND_COOLDOWN_SECONDS + 1
        )
        if cooldown_elapsed >= _RESEND_COOLDOWN_SECONDS:
            await send_otp(db, data.phone, data.language, purpose="password_reset")
    else:
        # Diagnostic — response is still 200 to avoid leaking which phones exist,
        # but the team needs to know when a stuck user hit the no-op branch.
        logger.warning("forgot-password: no user for phone=%s", data.phone)

    return {"message": "If an account exists with this phone, a code has been sent."}


@router.post("/verify-reset-code")
async def verify_reset_code(data: VerifyResetCodeRequest, db: AsyncSession = Depends(get_db)):
    """Pre-validate the reset OTP before the client shows the new-password screen.
    Does NOT consume the code — the subsequent /reset-password call does that."""
    if not await check_otp_valid(db, data.phone, data.code, purpose="password_reset"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )
    return {"valid": True}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and set new password."""
    valid = await verify_otp(db, data.phone, data.code, purpose="password_reset")
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )

    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    user.password_hash = hash_password(data.new_password)
    await db.flush()

    return {"message": "Password reset successfully"}
