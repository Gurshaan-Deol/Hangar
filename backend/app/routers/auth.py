"""Auth router — handles user auto-provisioning after NextAuth OAuth sign-in."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

# TODO: implement POST /auth/session — accept NextAuth JWT, auto-provision user in DB
