"""
Arbitrage Engine Agent
Input : crop name, volume in kg, origin city
Output: ranked market list with net profit, best recommendation
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import Crop, CropPrice, Market, MarketDistance
from app.schemas.models import ArbitrageRequest, ArbitrageResponse, MarketPrice
from app.services import price_service


async def run_arbitrage(req: ArbitrageRequest, db: AsyncSession) -> ArbitrageResponse:
    crop_result = await db.execute(select(Crop).where(Crop.name == req.crop))
    crop = crop_result.scalar_one_or_none()
    if crop is None:
        raise ValueError(f"Crop '{req.crop}' not found in database.")

    prices_result = await db.execute(
        select(CropPrice)
        .where(CropPrice.crop_id == crop.id)
        .options(selectinload(CropPrice.market))
    )
    prices = prices_result.scalars().all()

    dist_result = await db.execute(
        select(MarketDistance)
        .where(MarketDistance.origin_city == req.origin_city)
        .options(selectinload(MarketDistance.market))
    )
    distances = {d.market.city: d for d in dist_result.scalars().all()}

    markets = []
    for cp in prices:
        city = cp.market.city
        dist_obj = distances.get(city)
        distance_km = dist_obj.distance_km if dist_obj else 0
        transport_per_kg = dist_obj.transport_cost_per_kg_kes if dist_obj else 0

        live_price, _source = await price_service.get_price(req.crop, city, db)
        price_per_kg = live_price if live_price > 0 else cp.price_per_kg_kes

        gross = price_per_kg * req.volume_kg
        transport_total = transport_per_kg * req.volume_kg
        net = gross - transport_total

        markets.append(MarketPrice(
            market=cp.market.name,
            city=city,
            price_per_kg_kes=price_per_kg,
            distance_km=distance_km,
            transport_cost_kes=round(transport_total, 2),
            net_profit_kes=round(net, 2),
            recommended=False,
        ))

    markets.sort(key=lambda m: m.net_profit_kes, reverse=True)
    if markets:
        markets[0] = markets[0].model_copy(update={"recommended": True})

    best = markets[0] if markets else None
    worst = markets[-1] if markets else None
    extra = round(best.net_profit_kes - worst.net_profit_kes, 2) if (best and worst) else 0

    swahili = _swahili_advice(best, req.volume_kg, extra) if best else ""

    return ArbitrageResponse(
        crop=req.crop,
        volume_kg=req.volume_kg,
        markets=markets,
        best_market=best.city if best else "",
        extra_profit_vs_worst_kes=extra,
        swahili_advice=swahili,
    )


def _swahili_advice(best: MarketPrice, volume: float, extra: float) -> str:
    return (
        f"Leo uza sokoni {best.city}. "
        f"Utapata KES {best.net_profit_kes:,.0f} kwa kilo {volume:,.0f}. "
        f"Hii ni faida ya ziada ya KES {extra:,.0f} ikilinganishwa na soko baya zaidi."
    )
