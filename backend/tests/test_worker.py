"""Tests for the AI analysis background worker."""

import dataclasses
import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio

from app.models.clothing_item import ClothingItem
from app.services.ai.base import ClothingAnalysis
from app.workers.ai_analysis import _normalize_analysis, analyze_clothing_image


def _make_item(db_session, status="pending") -> ClothingItem:
    item = ClothingItem(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        image_path="/tmp/test_image.jpg",
        status=status,
    )
    return item


def _make_analysis(**kwargs) -> ClothingAnalysis:
    defaults = dict(
        name="Blue Oxford Shirt",
        category="shirt",
        color="blue",
        style="casual",
        season=["spring", "summer"],
        tags=["weekend", "classic"],
        confidence=0.95,
    )
    defaults.update(kwargs)
    return ClothingAnalysis(**defaults)


# ---------------------------------------------------------------------------
# _normalize_analysis
# ---------------------------------------------------------------------------

def test_normalize_analysis_lowercases_fields():
    raw = ClothingAnalysis(
        name="BLUE SHIRT",
        category="SHIRT",
        color="NAVY BLUE",
        style="CASUAL",
        season=["SPRING", "SUMMER"],
        tags=["WEEKEND", "CLASSIC"],
        confidence=0.9,
    )
    result = _normalize_analysis(raw)
    assert result.name == "Blue Shirt"
    assert result.category == "shirt"
    assert result.color == "navy blue"
    assert result.style == "casual"
    assert result.season == ["spring", "summer"]
    assert result.tags == ["weekend", "classic"]


def test_normalize_analysis_handles_none_fields():
    raw = ClothingAnalysis(
        name=None,
        category=None,
        color=None,
        style=None,
        season=None,
        tags=None,
        confidence=0.5,
    )
    result = _normalize_analysis(raw)
    assert result.name is None
    assert result.category is None
    assert result.season == []
    assert result.tags == []


# ---------------------------------------------------------------------------
# analyze_clothing_image (integration — uses real SQLite session from conftest)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_clothing_image_success(db_session):
    item = _make_item(db_session)
    db_session.add(item)
    await db_session.commit()

    mock_analysis = _make_analysis()
    mock_provider = AsyncMock()
    mock_provider.analyze_clothing_image = AsyncMock(return_value=mock_analysis)
    mock_provider.check_duplicate = AsyncMock(return_value={"duplicate_found": False})

    ctx = {}
    with (
        patch("app.workers.ai_analysis.get_ai_provider", return_value=mock_provider),
        patch("app.workers.ai_analysis.remove_background", return_value=item.image_path),
        patch("app.workers.ai_analysis.preprocess_image", return_value=item.image_path),
        patch("app.workers.ai_analysis.AsyncSessionLocal") as mock_session_maker,
    ):
        mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=db_session)
        mock_session_maker.return_value.__aexit__ = AsyncMock(return_value=None)

        await analyze_clothing_image(ctx, str(item.id))

    await db_session.refresh(item)
    assert item.status == "ready"
    assert item.name == "Blue Oxford Shirt"
    assert item.category == "shirt"
    assert item.color == "blue"
    assert item.attempt_count == 1


@pytest.mark.asyncio
async def test_analyze_clothing_image_retries_on_failure_then_succeeds(db_session):
    item = _make_item(db_session)
    db_session.add(item)
    await db_session.commit()

    call_count = 0

    async def flaky_analyze(_path):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise RuntimeError("Transient AI error")
        return _make_analysis()

    mock_provider = AsyncMock()
    mock_provider.analyze_clothing_image = flaky_analyze
    mock_provider.check_duplicate = AsyncMock(return_value={"duplicate_found": False})

    ctx = {}
    with (
        patch("app.workers.ai_analysis.get_ai_provider", return_value=mock_provider),
        patch("app.workers.ai_analysis.remove_background", return_value=item.image_path),
        patch("app.workers.ai_analysis.preprocess_image", return_value=item.image_path),
        patch("app.workers.ai_analysis.asyncio.sleep", new_callable=AsyncMock),
        patch("app.workers.ai_analysis.AsyncSessionLocal") as mock_session_maker,
    ):
        mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=db_session)
        mock_session_maker.return_value.__aexit__ = AsyncMock(return_value=None)

        await analyze_clothing_image(ctx, str(item.id))

    await db_session.refresh(item)
    assert item.status == "ready"
    assert item.attempt_count == 3


@pytest.mark.asyncio
async def test_analyze_clothing_image_marks_failed_after_max_retries(db_session):
    item = _make_item(db_session)
    db_session.add(item)
    await db_session.commit()

    mock_provider = AsyncMock()
    mock_provider.analyze_clothing_image = AsyncMock(
        side_effect=RuntimeError("AI always fails")
    )

    ctx = {}
    with (
        patch("app.workers.ai_analysis.get_ai_provider", return_value=mock_provider),
        patch("app.workers.ai_analysis.remove_background", return_value=item.image_path),
        patch("app.workers.ai_analysis.preprocess_image", return_value=item.image_path),
        patch("app.workers.ai_analysis.asyncio.sleep", new_callable=AsyncMock),
        patch("app.workers.ai_analysis.AsyncSessionLocal") as mock_session_maker,
    ):
        mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=db_session)
        mock_session_maker.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(RuntimeError, match="AI always fails"):
            await analyze_clothing_image(ctx, str(item.id))

    await db_session.refresh(item)
    assert item.status == "failed"
    assert item.attempt_count == 3


@pytest.mark.asyncio
async def test_analyze_clothing_image_noop_for_missing_item(db_session):
    """Worker must silently skip items that no longer exist (deleted during analysis)."""
    ctx = {}
    with patch("app.workers.ai_analysis.AsyncSessionLocal") as mock_session_maker:
        mock_session_maker.return_value.__aenter__ = AsyncMock(return_value=db_session)
        mock_session_maker.return_value.__aexit__ = AsyncMock(return_value=None)
        # No item added to DB — should return without raising
        await analyze_clothing_image(ctx, str(uuid.uuid4()))
