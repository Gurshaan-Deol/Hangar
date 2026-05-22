"""drop_image_url_from_clothing_items

Revision ID: a1b2c3d4e5f6
Revises: 7d40f2c7144c
Create Date: 2026-05-19 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7d40f2c7144c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # image_url was used for the now-removed public StaticFiles mount.
    # Images are served exclusively via the authenticated /clothing/{id}/image endpoint.
    op.drop_column('clothing_items', 'image_url')


def downgrade() -> None:
    op.add_column(
        'clothing_items',
        sa.Column('image_url', sa.String(500), nullable=True),
    )
