from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    phone: str
    email: EmailStr | None = None
    password: str
    first_name: str
    last_name: str
    role: str = "client"  # "client" or "owner" (admin cannot self-register)
    language: str = "fr"


class UserLogin(BaseModel):
    identifier: str  # email or phone number
    password: str


class UserResponse(BaseModel):
    id: UUID
    phone: str
    email: str | None = None
    first_name: str
    last_name: str
    role: str
    language_pref: str
    is_approved: bool = True
    is_phone_verified: bool = False

    model_config = {"from_attributes": True}


class OwnerApplicationResponse(BaseModel):
    message: str
    status: str = "pending"


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    language_pref: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterResponse(BaseModel):
    """Unified register response — always requires OTP verification first."""
    user: UserResponse
    requires_verification: bool = True
    is_pending: bool = False
    message: str | None = None


class OTPVerifyRequest(BaseModel):
    phone: str
    code: str


class OTPResendRequest(BaseModel):
    phone: str
    language: str = "fr"


class OTPVerifyResponse(BaseModel):
    """After OTP verified: clients get tokens, owners get pending status."""
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: UserResponse
    is_pending: bool = False
    message: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str
