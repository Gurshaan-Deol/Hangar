"""SQLAlchemy ORM models for saved outfits and per-outfit user feedback."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.clothing_item import ClothingItem
    from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


outfit_items = Table(
    "outfit_items",
    Base.metadata,
    Column(
        "outfit_id",
        UUID(as_uuid=True),
        ForeignKey("outfits.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "clothing_item_id",
        UUID(as_uuid=True),
        ForeignKey("clothing_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    weather_temp_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    weather_temp_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    style_tip: Mapped[str | None] = mapped_column(Text, nullable=True)
    locked_item_ids: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    user_instruction: Mapped[str | None] = mapped_column(String(300), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_favourite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    wear_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    worn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    user: Mapped[User] = relationship("User", back_populates="outfits")
    items: Mapped[list[ClothingItem]] = relationship(
        "ClothingItem", secondary=outfit_items
    )


class OutfitFeedback(Base):
    __tablename__ = "outfit_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    outfit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("outfits.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rating: Mapped[str] = mapped_column(String(4), nullable=False)  # "up" | "down"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("outfit_id", "user_id", name="uq_outfit_feedback_outfit_user"),
    )
