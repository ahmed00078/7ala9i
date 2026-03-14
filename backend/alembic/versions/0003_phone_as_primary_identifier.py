"""phone as primary identifier: phone NOT NULL unique, email nullable

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make phone NOT NULL, unique, indexed
    op.alter_column('users', 'phone',
                    existing_type=sa.String(length=20),
                    nullable=False)
    op.create_unique_constraint('uq_users_phone', 'users', ['phone'])
    op.create_index('ix_users_phone', 'users', ['phone'], unique=True)

    # Make email nullable (was NOT NULL)
    op.alter_column('users', 'email',
                    existing_type=sa.String(length=255),
                    nullable=True)


def downgrade() -> None:
    # Restore email as NOT NULL
    op.alter_column('users', 'email',
                    existing_type=sa.String(length=255),
                    nullable=False)

    # Remove phone constraints and make nullable again
    op.drop_index('ix_users_phone', table_name='users')
    op.drop_constraint('uq_users_phone', 'users', type_='unique')
    op.alter_column('users', 'phone',
                    existing_type=sa.String(length=20),
                    nullable=True)
