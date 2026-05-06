"""
Orchestrator — delegates to the AgriSync CrewAI crew and handles SMS dispatch.
"""
import logging
from typing import Optional

from app.agents.crew import run_crew
from app.config import settings
from app.schemas.models import DiagnoseResponse, ArbitrageResponse, ReportResponse

logger = logging.getLogger("agrisync.orchestrator")


async def run_orchestrator(
    diag: Optional[DiagnoseResponse],
    arb: Optional[ArbitrageResponse],
    farmer_name: Optional[str],
    phone: Optional[str],
    send_sms: bool,
    origin_city: str = "Nakuru",
) -> ReportResponse:
    farmer = farmer_name or "Farmer"
    english, swahili, sms = await run_crew(diag, arb, farmer, origin_city)

    if send_sms and phone:
        await _send_sms(phone, sms)

    return ReportResponse(
        english_report=english,
        swahili_report=swahili,
        sms_text=sms,
        send_sms=send_sms and bool(phone),
    )


async def _send_sms(phone: str, message: str):
    if not settings.africas_talking_api_key:
        logger.info("SMS (mock) to %s: %s", phone, message)
        return
    try:
        import africastalking
        africastalking.initialize(settings.africas_talking_username, settings.africas_talking_api_key)
        africastalking.SMS.send(message, [phone])
        logger.info("SMS sent to %s", phone)
    except Exception as exc:
        logger.error("SMS error: %s", exc)
