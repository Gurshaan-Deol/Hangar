"""add cascade delete to outfit_items

Revision ID: 80b655dd722c
Revises: a1b2c3d4e5f6
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80b655dd722c'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('outfit_items_outfit_id_fkey', 'outfit_items', type_='foreignkey')
    op.drop_constraint('outfit_items_clothing_item_id_fkey', 'outfit_items', type_='foreignkey')
    op.create_foreign_key(
        'outfit_items_outfit_id_fkey',
        'outfit_items', 'outfits',
        ['outfit_id'], ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'outfit_items_clothing_item_id_fkey',
        'outfit_items', 'clothing_items',
        ['clothing_item_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('outfit_items_outfit_id_fkey', 'outfit_items', type_='foreignkey')
    op.drop_constraint('outfit_items_clothing_item_id_fkey', 'outfit_items', type_='foreignkey')
    op.create_foreign_key(
        'outfit_items_outfit_id_fkey',
        'outfit_items', 'outfits',
        ['outfit_id'], ['id'],
    )
    op.create_foreign_key(
        'outfit_items_clothing_item_id_fkey',
        'outfit_items', 'clothing_items',
        ['clothing_item_id'], ['id'],
    )
