"""add attempt_count to clothing_items

Revision ID: 0672ecc4a423
Revises: 13334f10344d
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0672ecc4a423"
down_revision: Union[str, None] = "13334f10344d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clothing_items",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("clothing_items", "attempt_count")
