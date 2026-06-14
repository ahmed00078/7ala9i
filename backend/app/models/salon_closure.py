import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, CheckConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SalonClosure(Base):
    __tablename__ = "salon_closures"
    __table_args__ = (
        CheckConstraint("end_at > start_at", name="check_closure_range"),
        Index("ix_salon_closures_salon_range", "salon_id", "start_at", "end_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    salon_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("salons.id", ondelete="CASCADE"), nullable=False
    )
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(140), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    salon = relationship("Salon", back_populates="closures", lazy="selectin")
