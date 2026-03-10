import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, Boolean, func
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
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.client, nullable=False
    )
    language_pref: Mapped[str] = mapped_column(String(5), default="fr", nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
