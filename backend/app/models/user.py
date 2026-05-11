"""SQLAlchemy ORM model for application users (auto-provisioned via OAuth)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("provider", "provider_id", name="uq_users_provider_provider_id"),
    )

    clothing_items: Mapped[list["ClothingItem"]] = relationship(  # type: ignore[name-defined]
        "ClothingItem", back_populates="user", cascade="all, delete-orphan"
    )
    outfits: Mapped[list["Outfit"]] = relationship(  # type: ignore[name-defined]
        "Outfit", back_populates="user", cascade="all, delete-orphan"
    )
