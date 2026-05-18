"""add_duplicate_fields_to_clothing_items

Revision ID: 901d72bfe016
Revises: 47dd738dd758
Create Date: 2026-05-12 02:26:46.106787

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "901d72bfe016"
down_revision: Union[str, None] = "47dd738dd758"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clothing_items",
        sa.Column(
            "duplicate_of",
            UUID(as_uuid=True),
            sa.ForeignKey("clothing_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "clothing_items",
        sa.Column("duplicate_confidence", sa.Float(), nullable=True),
    )
    op.add_column(
        "clothing_items",
        sa.Column("duplicate_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "clothing_items",
        sa.Column(
            "dismissed_duplicate",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_clothing_items_duplicate_of", "clothing_items", ["duplicate_of"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_clothing_items_duplicate_of", table_name="clothing_items")
    op.drop_column("clothing_items", "dismissed_duplicate")
    op.drop_column("clothing_items", "duplicate_reason")
    op.drop_column("clothing_items", "duplicate_confidence")
    op.drop_column("clothing_items", "duplicate_of")
