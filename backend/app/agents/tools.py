"""
CrewAI tools for AgriSync agents.

These tools query the AgriSync database synchronously (required by CrewAI's
tool interface) and return structured plain-text results that agents can
reason over. They are used in both mock and real-LLM modes — in mock mode
their output is pre-embedded into task descriptions; in real AMD MI300X mode
Mistral-7B can call them autonomously during task execution.
"""
import logging

import sqlalchemy as sa
from crewai.tools import BaseTool

from app.config import settings

logger = logging.getLogger("agrisync.tools")

# Sync engine — strips async driver prefix so SQLAlchemy can connect in the
# synchronous context that CrewAI tools require.
_sync_url = (
    settings.database_url
    .replace("+aiosqlite", "")
    .replace("+asyncpg", "")
)
_engine = sa.create_engine(_sync_url, pool_pre_ping=True)


class TreatmentProtocolTool(BaseTool):
    name: str = "Treatment Protocol Lookup"
    description: str = (
        "Fetch recommended chemical treatments for a specific crop disease "
        "from the AgriSync inventory database. "
        "Input: exact disease name (e.g. 'Tomato Late Blight'). "
        "Returns chemical name, active ingredient, dosage, application method, "
        "price in KES, and current stock status."
    )

    def _run(self, disease_name: str) -> str:
        try:
            with _engine.connect() as conn:
                rows = conn.execute(sa.text("""
                    SELECT ch.name, ch.active_ingredient, ch.dosage,
                           ch.application, ch.price_kes, ch.stock_units
                    FROM disease_chemicals dc
                    JOIN diseases d ON d.id = dc.disease_id
                    JOIN chemicals ch ON ch.id = dc.chemical_id
                    WHERE d.name = :name
                """), {"name": disease_name}).fetchall()
        except Exception as exc:
            logger.warning("TreatmentProtocolTool DB error: %s", exc)
            return f"Database unavailable — recommend standard broad-spectrum treatment for {disease_name}."

        if not rows:
            return (
                f"No specific protocol found for '{disease_name}'. "
                "Recommend Mancozeb 80WP at 2g/L as a broad-spectrum fungicide (KES 320)."
            )

        lines = [f"Registered treatment protocols for {disease_name}:"]
        for name, active, dosage, application, price, stock in rows:
            status = f"IN STOCK ({stock} units)" if stock > 0 else "OUT OF STOCK"
            lines.append(
                f"  • {name} [{active}] — {dosage} | {application} "
                f"| KES {price:,} | {status}"
            )
        return "\n".join(lines)


class MarketPriceTool(BaseTool):
    name: str = "Market Price Lookup"
    description: str = (
        "Fetch current crop prices (KES/kg) across Kenyan markets with net profit "
        "calculations after transport costs from the farmer's origin city. "
        "Input: crop name (e.g. Maize, Tomato, Beans, Potato, Cassava, Coffee, Kale). "
        "Returns price, transport cost, net profit per kg, and distance for each market, "
        "ranked best-to-worst."
    )
    origin_city: str = "Nakuru"

    def _run(self, crop: str) -> str:
        try:
            with _engine.connect() as conn:
                rows = conn.execute(sa.text("""
                    SELECT m.city, m.name AS market_name,
                           cp.price_per_kg_kes,
                           COALESCE(md.distance_km, 0)               AS distance_km,
                           COALESCE(md.transport_cost_per_kg_kes, 0) AS transport_cost
                    FROM crop_prices cp
                    JOIN crops c   ON c.id  = cp.crop_id
                    JOIN markets m ON m.id  = cp.market_id
                    LEFT JOIN market_distances md
                           ON md.market_id = m.id AND md.origin_city = :origin
                    WHERE c.name = :crop
                    ORDER BY (cp.price_per_kg_kes
                              - COALESCE(md.transport_cost_per_kg_kes, 0)) DESC
                """), {"crop": crop, "origin": self.origin_city}).fetchall()
        except Exception as exc:
            logger.warning("MarketPriceTool DB error: %s", exc)
            return f"Database unavailable — cannot fetch live prices for {crop}."

        if not rows:
            return f"No price data found for '{crop}'. Check crop name spelling."

        lines = [f"Live market prices for {crop} (origin: {self.origin_city}):"]
        for city, market_name, price, dist, transport in rows:
            net = price - transport
            lines.append(
                f"  • {city} — {market_name}: KES {price:.0f}/kg "
                f"| transport KES {transport:.2f}/kg | net KES {net:.2f}/kg | {dist:.0f} km"
            )
        best = rows[0]
        best_net = best[2] - best[4]
        worst_net = rows[-1][2] - rows[-1][4]
        lines.append(
            f"\nBEST MARKET: {best[0]} (net KES {best_net:.2f}/kg) — "
            f"KES {best_net - worst_net:.2f}/kg more than worst option ({rows[-1][0]})"
        )
        return "\n".join(lines)
