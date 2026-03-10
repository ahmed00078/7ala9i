"""add is_approved to users

Revision ID: 0001
Revises: 
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_approved column to users table (default True so existing users keep access)
    op.add_column(
        'users',
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column('users', 'is_approved')
