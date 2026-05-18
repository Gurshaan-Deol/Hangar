"""add composite indexes

Revision ID: 13334f10344d
Revises: fef3af99fb89
Create Date: 2026-05-18 23:31:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "13334f10344d"
down_revision: Union[str, None] = "fef3af99fb89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_clothing_user_status_category",
        "clothing_items",
        ["user_id", "status", "category"],
    )
    op.create_index(
        "ix_outfits_user_created",
        "outfits",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_clothing_user_status_category", table_name="clothing_items")
    op.drop_index("ix_outfits_user_created", table_name="outfits")
