"""Clothing router — CRUD for wardrobe items and photo upload."""

from fastapi import APIRouter

router = APIRouter(prefix="/clothing", tags=["clothing"])

# TODO: implement GET /clothing (paginated list for current user)
# TODO: implement POST /clothing (upload photo, create pending item, enqueue AI job)
# TODO: implement GET /clothing/{item_id}
# TODO: implement PATCH /clothing/{item_id}
# TODO: implement DELETE /clothing/{item_id}
