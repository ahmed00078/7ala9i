from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str
    first_name: str
    last_name: str
    role: str = "client"  # "client" or "owner" (admin cannot self-register)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    phone: str | None = None
    first_name: str
    last_name: str
    role: str
    language_pref: str
    is_approved: bool = True

    model_config = {"from_attributes": True}


class OwnerApplicationResponse(BaseModel):
    message: str
    status: str = "pending"


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    language_pref: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterResponse(BaseModel):
    """Unified register response: clients get tokens, owners get pending status."""
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: UserResponse
    is_pending: bool = False
    message: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str
