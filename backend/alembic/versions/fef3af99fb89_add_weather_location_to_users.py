"""add weather location to users

Revision ID: fef3af99fb89
Revises: 901d72bfe016
Create Date: 2026-05-18 23:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "fef3af99fb89"
down_revision: Union[str, None] = "901d72bfe016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("weather_lat", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("weather_lon", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "weather_lon")
    op.drop_column("users", "weather_lat")
