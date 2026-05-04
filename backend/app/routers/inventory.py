from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import Chemical
from app.schemas.models import InventoryItem

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItem])
async def list_inventory(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chemical).order_by(Chemical.name))
    chemicals = result.scalars().all()
    return [
        InventoryItem(
            chemical_name=c.name,
            sku=c.sku,
            stock_units=c.stock_units,
            unit_price_kes=c.price_kes,
            supplier=c.supplier,
        )
        for c in chemicals
    ]
