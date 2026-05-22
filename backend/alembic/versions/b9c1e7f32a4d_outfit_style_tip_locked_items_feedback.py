"""outfit style_tip, locked_items, user_instruction, outfit_feedback table

Revision ID: b9c1e7f32a4d
Revises: 80b655dd722c
Create Date: 2026-05-22 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b9c1e7f32a4d"
down_revision: Union[str, None] = "80b655dd722c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New columns on outfits
    op.add_column("outfits", sa.Column("style_tip", sa.Text(), nullable=True))
    op.add_column(
        "outfits",
        sa.Column(
            "locked_item_ids",
            postgresql.ARRAY(sa.Text()),
            nullable=True,
            server_default="{}",
        ),
    )
    op.add_column(
        "outfits",
        sa.Column("user_instruction", sa.String(length=300), nullable=True),
    )

    # outfit_feedback table
    op.create_table(
        "outfit_feedback",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "outfit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("outfits.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("rating", sa.String(length=4), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("outfit_id", "user_id", name="uq_outfit_feedback_outfit_user"),
    )


def downgrade() -> None:
    op.drop_table("outfit_feedback")
    op.drop_column("outfits", "user_instruction")
    op.drop_column("outfits", "locked_item_ids")
    op.drop_column("outfits", "style_tip")
