"""Bireysel hesap turunu mevcut kullanicilari bozmadan ekler.

Revision ID: a8b9c0d1e2f3
Revises: f2a3b4c5d6e7
Create Date: 2026-09-29

"""
import sqlalchemy as sa
from alembic import op


revision = "a8b9c0d1e2f3"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    exists = bind.execute(
        sa.text(
            """
            SELECT 1
            FROM pg_type t
            JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole' AND e.enumlabel = 'INDIVIDUAL'
            """
        )
    ).scalar()
    if exists:
        return
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE 'INDIVIDUAL'")


def downgrade():
    pass
