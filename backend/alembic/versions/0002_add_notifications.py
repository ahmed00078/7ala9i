"""add notifications table and reminder_sent to bookings

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # Create notifications table only if it doesn't exist
    if 'notifications' not in existing_tables:
        op.create_table(
            'notifications',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('body', sa.String(512), nullable=False),
            sa.Column('notif_type', sa.String(64), nullable=False),
            sa.Column('data', JSONB, nullable=True),
            sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    existing_indexes = {idx['name'] for idx in inspector.get_indexes('notifications')} if 'notifications' in existing_tables else set()
    if 'ix_notifications_user_id' not in existing_indexes:
        op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    if 'ix_notifications_created_at' not in existing_indexes:
        op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])

    # Add reminder_sent column to bookings only if it doesn't exist
    existing_columns = {col['name'] for col in inspector.get_columns('bookings')}
    if 'reminder_sent' not in existing_columns:
        op.add_column(
            'bookings',
            sa.Column('reminder_sent', sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    op.drop_column('bookings', 'reminder_sent')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')
