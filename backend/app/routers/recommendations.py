"""Recommendations router — AI outfit suggestions based on weather and wardrobe."""

from fastapi import APIRouter

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# TODO: implement GET /recommendations — fetch weather, run outfit matching, return suggestions
