from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.agents.agronomist import run_agronomist
from app.schemas.models import DiagnoseRequest, DiagnoseResponse

router = APIRouter(prefix="/diagnose", tags=["diagnosis"])


@router.post("", response_model=DiagnoseResponse)
async def diagnose(req: DiagnoseRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await run_agronomist(req.image_base64, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
