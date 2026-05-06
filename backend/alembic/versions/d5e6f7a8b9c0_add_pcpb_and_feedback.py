"""add pcpb fields to chemicals and diagnosis_feedback table

Revision ID: d5e6f7a8b9c0
Revises: b3c4d5e6f7a8
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa

revision = "d5e6f7a8b9c0"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def _existing_tables():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return set(inspector.get_table_names())


def _existing_columns(table: str):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade():
    tables = _existing_tables()

    # Add PCPB fields to chemicals (idempotent)
    if "chemicals" in tables:
        cols = _existing_columns("chemicals")
        if "pcpb_status" not in cols:
            op.add_column(
                "chemicals",
                sa.Column("pcpb_status", sa.String(20), nullable=False, server_default="unverified"),
            )
        if "safety_note" not in cols:
            op.add_column(
                "chemicals",
                sa.Column("safety_note", sa.Text(), nullable=True),
            )

    # Create diagnosis_feedback table
    if "diagnosis_feedback" not in tables:
        op.create_table(
            "diagnosis_feedback",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("phone", sa.String(20), nullable=True, index=True),
            sa.Column("ai_disease_name", sa.String(200), nullable=False),
            sa.Column("actual_disease", sa.String(200), nullable=True),
            sa.Column("ai_confidence", sa.Float(), nullable=True),
            sa.Column("image_hash", sa.String(64), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "reported_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )


def downgrade():
    tables = _existing_tables()
    if "diagnosis_feedback" in tables:
        op.drop_table("diagnosis_feedback")
    if "chemicals" in tables:
        cols = _existing_columns("chemicals")
        if "safety_note" in cols:
            op.drop_column("chemicals", "safety_note")
        if "pcpb_status" in cols:
            op.drop_column("chemicals", "pcpb_status")
