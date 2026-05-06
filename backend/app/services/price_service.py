"""
Price Service — 3-tier price resolution:
  1. In-memory TTL cache (6 h)
  2. PriceCache DB table
  3. WFP VAM public API  (for mapped commodities)
  4. Seed data (crop_prices table) — guaranteed fallback

Never surfaces an API error to the caller — always returns a price.
"""
import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Crop, CropPrice, Market, PriceCache

logger = logging.getLogger("agrisync.price_service")

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------

@dataclass
class _CacheEntry:
    price: float
    source: str
    fetched_at: float   # unix timestamp

_MEMORY_CACHE: dict[tuple[str, str], _CacheEntry] = {}
_CACHE_TTL: int = settings.price_cache_ttl_hours * 3600
_WFP_LOCK = asyncio.Lock()

# ---------------------------------------------------------------------------
# WFP VAM commodity mapping
# ---------------------------------------------------------------------------
_WFP_COMMODITY_MAP: dict[str, str] = {
    "Maize":   "Maize (white)",
    "Beans":   "Beans (dry)",
    "Potato":  "Potatoes (Irish)",
    "Tomato":  "Tomatoes",
    "Wheat":   "Wheat flour",
    "Sorghum": "Sorghum",
}

_WFP_MARKET_MAP: dict[str, str] = {
    "Nairobi":  "Nairobi",
    "Mombasa":  "Mombasa",
    "Kisumu":   "Kisumu",
    "Nakuru":   "Nakuru",
    "Eldoret":  "Eldoret",
    "Meru":     "Meru",
    "Kitale":   "Kitale",
}

_USD_KES_RATE = 130.0   # approximate — a live forex call could replace this


# ---------------------------------------------------------------------------
# WFP API fetch
# ---------------------------------------------------------------------------

async def _fetch_wfp_price(crop_name: str, market_city: str) -> Optional[float]:
    wfp_commodity = _WFP_COMMODITY_MAP.get(crop_name)
    wfp_market = _WFP_MARKET_MAP.get(market_city)
    if not wfp_commodity or not wfp_market:
        return None
    url = (
        "https://api.vam.wfp.org/api/vam-data-bridges/1.2.0/MarketPrices/PriceWeekly"
        f"?CountryCode=KEN&CommodityName={wfp_commodity}&page=1&format=json"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            logger.debug("WFP API returned %d for %s/%s", resp.status_code, crop_name, market_city)
            return None
        data = resp.json()
        items = data.get("items") or data.get("data") or []
        for item in items:
            item_market = (item.get("marketName") or item.get("market_name") or "").lower()
            if wfp_market.lower() in item_market:
                price_usd = item.get("unit_price_usd") or item.get("price")
                if price_usd:
                    return float(price_usd) * _USD_KES_RATE
    except Exception as exc:
        logger.debug("WFP API error (%s/%s): %s", crop_name, market_city, exc)
    return None


# ---------------------------------------------------------------------------
# DB cache read/write
# ---------------------------------------------------------------------------

async def _read_db_cache(crop_name: str, market_city: str, db: AsyncSession) -> Optional[float]:
    now = datetime.utcnow()
    r = await db.execute(
        select(PriceCache).where(
            PriceCache.crop_name == crop_name,
            PriceCache.market_city == market_city,
            PriceCache.expires_at > now,
        )
    )
    entry = r.scalars().first()
    return entry.price_per_kg_kes if entry else None


async def _write_db_cache(
    crop_name: str, market_city: str, price: float, source: str, db: AsyncSession
) -> None:
    now = datetime.utcnow()
    expires = now + timedelta(seconds=_CACHE_TTL)
    r = await db.execute(
        select(PriceCache).where(
            PriceCache.crop_name == crop_name,
            PriceCache.market_city == market_city,
        )
    )
    entry = r.scalars().first()
    if entry:
        entry.price_per_kg_kes = price
        entry.source = source
        entry.fetched_at = now
        entry.expires_at = expires
    else:
        db.add(PriceCache(
            crop_name=crop_name,
            market_city=market_city,
            price_per_kg_kes=price,
            source=source,
            fetched_at=now,
            expires_at=expires,
        ))


# ---------------------------------------------------------------------------
# Seed data fallback
# ---------------------------------------------------------------------------

async def _read_seed_price(crop_name: str, market_city: str, db: AsyncSession) -> Optional[float]:
    r = await db.execute(
        select(CropPrice.price_per_kg_kes)
        .join(Crop, Crop.id == CropPrice.crop_id)
        .join(Market, Market.id == CropPrice.market_id)
        .where(Crop.name == crop_name, Market.city == market_city)
    )
    row = r.scalar_one_or_none()
    return float(row) if row is not None else None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_price(
    crop_name: str,
    market_city: str,
    db: AsyncSession,
) -> tuple[float, str]:
    """
    Returns (price_per_kg_kes, source_label).
    source_label is one of: 'wfp_live', 'db_cache', 'seed_data', 'default'.
    Never raises — always returns something usable.
    """
    cache_key = (crop_name, market_city)

    # 1. Memory cache
    entry = _MEMORY_CACHE.get(cache_key)
    if entry and (time.monotonic() - entry.fetched_at) < _CACHE_TTL:
        return entry.price, entry.source

    # 2. DB cache
    db_price = await _read_db_cache(crop_name, market_city, db)
    if db_price is not None:
        _MEMORY_CACHE[cache_key] = _CacheEntry(db_price, "db_cache", time.monotonic())
        return db_price, "db_cache"

    # 3. WFP API (serialised to prevent request stampede)
    async with _WFP_LOCK:
        # Re-check memory after acquiring lock (another coroutine may have fetched)
        entry = _MEMORY_CACHE.get(cache_key)
        if entry and (time.monotonic() - entry.fetched_at) < _CACHE_TTL:
            return entry.price, entry.source

        wfp_price = await _fetch_wfp_price(crop_name, market_city)
        if wfp_price is not None:
            _MEMORY_CACHE[cache_key] = _CacheEntry(wfp_price, "wfp_live", time.monotonic())
            try:
                await _write_db_cache(crop_name, market_city, wfp_price, "wfp_live", db)
                await db.commit()
            except Exception:
                await db.rollback()
            return wfp_price, "wfp_live"

    # 4. Seed data
    seed_price = await _read_seed_price(crop_name, market_city, db)
    if seed_price is not None:
        _MEMORY_CACHE[cache_key] = _CacheEntry(seed_price, "seed_data", time.monotonic())
        return seed_price, "seed_data"

    # 5. Hard default (should never reach here with complete seed data)
    logger.warning("No price found for %s in %s — using fallback 50 KES/kg", crop_name, market_city)
    return 50.0, "default"
