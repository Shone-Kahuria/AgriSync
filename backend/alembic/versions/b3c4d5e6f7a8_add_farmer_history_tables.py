"""add farmer history tables

Revision ID: b3c4d5e6f7a8
Revises: 842d89da02b9
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa

revision = "b3c4d5e6f7a8"
down_revision = "842d89da02b9"
branch_labels = None
depends_on = None


def _existing_tables():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return set(inspector.get_table_names())


def upgrade():
    existing = _existing_tables()

    if "farmers" not in existing:
        op.create_table(
            "farmers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("phone", sa.String(20), nullable=False, unique=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("county", sa.String(100), nullable=True),
            sa.Column("primary_crop", sa.String(100), nullable=True),
            sa.Column("registered_at", sa.DateTime(), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_farmers_phone", "farmers", ["phone"], unique=True)

    if "diagnosis_history" not in existing:
        op.create_table(
            "diagnosis_history",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("farmer_id", sa.Integer(), sa.ForeignKey("farmers.id"), nullable=False),
            sa.Column("disease_name", sa.String(200), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=False),
            sa.Column("severity", sa.String(20), nullable=False),
            sa.Column("crop_type", sa.String(100), nullable=True),
            sa.Column("treatment_given", sa.String(200), nullable=True),
            sa.Column("queried_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_diagnosis_history_farmer_id", "diagnosis_history", ["farmer_id"])

    if "market_queries" not in existing:
        op.create_table(
            "market_queries",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("farmer_id", sa.Integer(), sa.ForeignKey("farmers.id"), nullable=False),
            sa.Column("crop", sa.String(100), nullable=False),
            sa.Column("volume_kg", sa.Float(), nullable=False),
            sa.Column("origin_city", sa.String(100), nullable=False),
            sa.Column("best_market_recommended", sa.String(100), nullable=True),
            sa.Column("net_profit_kes", sa.Float(), nullable=True),
            sa.Column("queried_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_market_queries_farmer_id", "market_queries", ["farmer_id"])

    if "price_cache" not in existing:
        op.create_table(
            "price_cache",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("crop_name", sa.String(100), nullable=False),
            sa.Column("market_city", sa.String(100), nullable=False),
            sa.Column("price_per_kg_kes", sa.Float(), nullable=False),
            sa.Column("source", sa.String(50), nullable=False),
            sa.Column("fetched_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("crop_name", "market_city", name="uq_price_cache_crop_market"),
        )
        op.create_index("ix_price_cache_crop_name", "price_cache", ["crop_name"])
        op.create_index("ix_price_cache_market_city", "price_cache", ["market_city"])


def downgrade():
    existing = _existing_tables()
    for table in ("market_queries", "diagnosis_history", "price_cache", "farmers"):
        if table in existing:
            op.drop_table(table)
