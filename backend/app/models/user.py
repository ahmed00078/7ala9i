import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, Boolean, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    client = "client"
    owner = "owner"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Uniqueness is enforced by partial unique indexes (uq_users_phone_active,
    # uq_users_email_active) so soft-deleted rows don't block re-registration.
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.client, nullable=False
    )
    language_pref: Mapped[str] = mapped_column(String(5), default="fr", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    original_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    original_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    salons = relationship("Salon", back_populates="owner", lazy="selectin")
    bookings = relationship("Booking", back_populates="client", lazy="selectin")
    reviews = relationship("Review", back_populates="client", lazy="selectin")
    favorites = relationship("Favorite", back_populates="user", lazy="selectin")
    push_tokens = relationship("PushToken", back_populates="user", lazy="selectin")
    notifications = relationship("Notification", back_populates="user", lazy="selectin")
