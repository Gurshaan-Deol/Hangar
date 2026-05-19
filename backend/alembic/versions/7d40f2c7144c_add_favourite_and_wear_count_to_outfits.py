"""add_favourite_and_wear_count_to_outfits

Revision ID: 7d40f2c7144c
Revises: 0672ecc4a423
Create Date: 2026-05-19 13:29:57.733279

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d40f2c7144c'
down_revision: Union[str, None] = '0672ecc4a423'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('outfits', sa.Column('is_favourite', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('outfits', sa.Column('wear_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('outfits', 'wear_count')
    op.drop_column('outfits', 'is_favourite')
