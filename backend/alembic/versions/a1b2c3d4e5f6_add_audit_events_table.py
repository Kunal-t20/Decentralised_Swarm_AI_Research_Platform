"""add_audit_events_table

Revision ID: a1b2c3d4e5f6
Revises: 83d1e266fa37
Create Date: 2026-08-15 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '83d1e266fa37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('agent', sa.String(length=50), nullable=True),
        sa.Column('tier_used', sa.Integer(), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['research_jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_events_id'), 'audit_events', ['id'], unique=False)
    op.create_index(op.f('ix_audit_events_job_id'), 'audit_events', ['job_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_events_job_id'), table_name='audit_events')
    op.drop_index(op.f('ix_audit_events_id'), table_name='audit_events')
    op.drop_table('audit_events')
