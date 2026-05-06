import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.agents.arbitrage import run_arbitrage
from app.limiter import limiter
from app.schemas.models import ArbitrageRequest, ArbitrageResponse
from app.services import farmer_service

logger = logging.getLogger("agrisync")
router = APIRouter(prefix="/arbitrage", tags=["market"])


@router.post("", response_model=ArbitrageResponse)
@limiter.limit("30/minute")
async def arbitrage(request: Request, req: ArbitrageRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await run_arbitrage(req, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Non-blocking history recording when phone is provided
    if req.phone and result.markets:
        try:
            farmer = await farmer_service.get_farmer_by_phone(req.phone, db)
            if farmer:
                best = result.markets[0]
                await farmer_service.record_market_query(
                    farmer_id=farmer.id,
                    crop=result.crop,
                    volume_kg=result.volume_kg,
                    origin_city=req.origin_city,
                    best_market=result.best_market,
                    net_profit_kes=best.net_profit_kes,
                    db=db,
                )
                await db.commit()
        except Exception as exc:
            logger.warning("History recording failed (non-fatal): %s", exc)

    return result
