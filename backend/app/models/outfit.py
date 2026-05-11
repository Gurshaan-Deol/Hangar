"""SQLAlchemy ORM model for a saved outfit (collection of clothing items)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


outfit_items = Table(
    "outfit_items",
    Base.metadata,
    Column("outfit_id", UUID(as_uuid=True), ForeignKey("outfits.id"), primary_key=True),
    Column(
        "clothing_item_id",
        UUID(as_uuid=True),
        ForeignKey("clothing_items.id"),
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
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    worn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    user: Mapped["User"] = relationship("User", back_populates="outfits")  # type: ignore[name-defined]
    items: Mapped[list["ClothingItem"]] = relationship(  # type: ignore[name-defined]
        "ClothingItem", secondary=outfit_items
    )
