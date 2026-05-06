from fastapi import APIRouter, HTTPException, Request
from app.agents.orchestrator import run_orchestrator
from app.limiter import limiter
from app.schemas.models import ReportRequest, ReportResponse

router = APIRouter(prefix="/report", tags=["report"])


@router.post("", response_model=ReportResponse)
@limiter.limit("20/minute")
async def generate_report(request: Request, req: ReportRequest):
    try:
        return await run_orchestrator(
            diag=req.diagnose_result,
            arb=req.arbitrage_result,
            farmer_name=req.farmer_name,
            phone=req.phone,
            send_sms=bool(req.phone),
            origin_city=req.origin_city or "Nakuru",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
