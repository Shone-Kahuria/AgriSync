"""initial_schema

Revision ID: 842d89da02b9
Revises:
Create Date: 2026-05-04 20:07:12.848103

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '842d89da02b9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set[str]:
    bind = op.get_bind()
    return set(sa.inspect(bind).get_table_names())


def upgrade() -> None:
    existing = _existing_tables()

    if "markets" not in existing:
        op.create_table(
            "markets",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("city", sa.String(100), nullable=False),
        )
    if "crops" not in existing:
        op.create_table(
            "crops",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("name_sw", sa.String(100)),
        )
    if "chemicals" not in existing:
        op.create_table(
            "chemicals",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("sku", sa.String(50), nullable=False, unique=True),
            sa.Column("active_ingredient", sa.String(200)),
            sa.Column("dosage", sa.String(200)),
            sa.Column("application", sa.Text),
            sa.Column("price_kes", sa.Integer),
            sa.Column("supplier", sa.String(200)),
            sa.Column("stock_units", sa.Integer),
        )
    if "crop_prices" not in existing:
        op.create_table(
            "crop_prices",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("crop_id", sa.Integer, sa.ForeignKey("crops.id")),
            sa.Column("market_id", sa.Integer, sa.ForeignKey("markets.id")),
            sa.Column("price_per_kg_kes", sa.Float, nullable=False),
        )
    if "market_distances" not in existing:
        op.create_table(
            "market_distances",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("origin_city", sa.String(100), nullable=False),
            sa.Column("market_id", sa.Integer, sa.ForeignKey("markets.id")),
            sa.Column("distance_km", sa.Float, nullable=False),
            sa.Column("transport_cost_per_kg_kes", sa.Float, nullable=False),
        )
    if "diseases" not in existing:
        op.create_table(
            "diseases",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("name_sw", sa.String(200)),
            sa.Column("crop_id", sa.Integer, sa.ForeignKey("crops.id")),
            sa.Column("symptoms", sa.Text),
            sa.Column("severity", sa.String(20)),
        )
    if "disease_chemicals" not in existing:
        op.create_table(
            "disease_chemicals",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("disease_id", sa.Integer, sa.ForeignKey("diseases.id")),
            sa.Column("chemical_id", sa.Integer, sa.ForeignKey("chemicals.id")),
        )


def downgrade() -> None:
    op.drop_table("disease_chemicals")
    op.drop_table("diseases")
    op.drop_table("market_distances")
    op.drop_table("crop_prices")
    op.drop_table("chemicals")
    op.drop_table("crops")
    op.drop_table("markets")
