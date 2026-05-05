from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.agents.arbitrage import run_arbitrage
from app.limiter import limiter
from app.schemas.models import ArbitrageRequest, ArbitrageResponse

router = APIRouter(prefix="/arbitrage", tags=["market"])


@router.post("", response_model=ArbitrageResponse)
@limiter.limit("30/minute")
async def arbitrage(request: Request, req: ArbitrageRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await run_arbitrage(req, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
