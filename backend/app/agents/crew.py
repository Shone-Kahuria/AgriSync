"""
AgriSync CrewAI pipeline — Track 1 (Agentic Workflows) + Track 3 (Vision & Multimodal).

Three agents run sequentially:
  1. AgronomistAgent    — calls TreatmentProtocolTool → treatment plan
  2. ArbitrageAgent     — calls MarketPriceTool       → sell recommendation
  3. OrchestratorAgent  — combines both               → bilingual report + SMS

In mock mode  : agents use AgriSyncMockLLM; tools are pre-called and their
                output is embedded in task descriptions so data flows through.
In real mode  : agents use Mistral-7B-Instruct on AMD MI300X and call tools
                autonomously during task execution.
"""
import asyncio
from typing import Optional

from crewai import Agent, Task, Crew, Process

from app.agents.llm import get_llm
from app.agents.tools import TreatmentProtocolTool, MarketPriceTool
from app.schemas.models import DiagnoseResponse, ArbitrageResponse


# ---------------------------------------------------------------------------
# Synchronous crew builder — called via asyncio.to_thread from async context
# ---------------------------------------------------------------------------

def _build_and_run(
    diag: Optional[DiagnoseResponse],
    arb: Optional[ArbitrageResponse],
    farmer: str,
) -> tuple[str, str, str]:
    """Build and run the AgriSync crew. Returns (english, swahili, sms)."""

    treatment_tool = TreatmentProtocolTool()
    market_tool = MarketPriceTool()

    # ---- Pre-call tools to embed live data in task descriptions ----
    # This ensures data-rich context even when the mock LLM is active.
    treatment_data = (
        treatment_tool._run(diag.disease_name) if diag else
        "No disease diagnosis — skipping treatment lookup."
    )
    market_data = (
        market_tool._run(arb.crop) if arb else
        "No crop data — skipping market price lookup."
    )

    # ---- shared context dicts passed to mock LLM ----
    diag_ctx: dict = {}
    arb_ctx: dict = {}
    orch_ctx: dict = {"farmer": farmer}

    if diag:
        first_chem = diag.recommendations[0] if diag.recommendations else None
        diag_ctx = {
            "role": "agronomist",
            "disease": diag.disease_name,
            "severity": diag.severity,
            "chemical": first_chem.name if first_chem else "recommended fungicide",
            "dosage": first_chem.dosage if first_chem else "as directed",
            "application": first_chem.application if first_chem else "",
        }
        orch_ctx.update({
            "disease": diag.disease_name,
            "conf": int(diag.confidence * 100),
            "severity": diag.severity,
            "chemical": first_chem.name if first_chem else "recommended fungicide",
            "price": first_chem.price_kes if first_chem else 0,
            "crop_hint": _guess_crop(diag.disease_name),
        })

    if arb:
        best = arb.markets[0] if arb.markets else None
        arb_ctx = {
            "role": "arbitrage",
            "volume": arb.volume_kg,
            "crop": arb.crop,
            "origin": arb.markets[-1].city if arb.markets else "farm",
            "best_market": arb.best_market,
            "net_profit": best.net_profit_kes if best else 0,
            "extra": arb.extra_profit_vs_worst_kes,
        }
        orch_ctx.update({
            "volume": arb.volume_kg,
            "crop": arb.crop,
            "best_market": arb.best_market,
            "net_profit": best.net_profit_kes if best else 0,
            "extra": arb.extra_profit_vs_worst_kes,
        })

    # ---- Agent 1: Agronomist ----
    agronomist = Agent(
        role="Senior Plant Pathologist",
        goal=(
            "Interpret crop disease diagnosis results and produce a clear "
            "treatment recommendation that a smallholder farmer can act on immediately. "
            "Use the Treatment Protocol Lookup tool to verify available chemicals and costs."
        ),
        backstory=(
            "You are a plant pathologist with 20 years of field experience across "
            "Kenya, Uganda, and Tanzania. You specialise in identifying and treating "
            "common smallholder crop diseases quickly and affordably. You always "
            "check the AgriSync inventory before recommending a chemical."
        ),
        llm=get_llm(diag_ctx),
        tools=[treatment_tool],
        allow_delegation=False,
        verbose=True,
    )

    # ---- Agent 2: Market Arbitrage Analyst ----
    arbitrage_analyst = Agent(
        role="Agricultural Market Analyst",
        goal=(
            "Analyse real-time crop prices across Kenyan markets and recommend "
            "the most profitable selling destination after accounting for transport costs. "
            "Use the Market Price Lookup tool to fetch live prices."
        ),
        backstory=(
            "You are a market analyst at the Kenya Agricultural Commodity Exchange (KACE). "
            "You have deep knowledge of seasonal price patterns, transport logistics, "
            "and KES/kg margins across Nairobi, Mombasa, Kisumu, and Nakuru. "
            "You always verify prices from the live AgriSync database before advising."
        ),
        llm=get_llm(arb_ctx),
        tools=[market_tool],
        allow_delegation=False,
        verbose=True,
    )

    # ---- Agent 3: Bilingual Orchestrator ----
    orchestrator = Agent(
        role="AgriSync Bilingual Farm Advisor",
        goal=(
            "Synthesise disease and market insights into a single, friendly advisory "
            "in both English and Swahili that a farmer with basic literacy can act on."
        ),
        backstory=(
            "You are the voice of AgriSync. You take technical outputs from plant "
            "pathologists and market analysts and translate them into actionable advice "
            "for smallholder farmers in Kenya. You always write in both English and "
            "Swahili, using simple language, concrete numbers, and a warm tone."
        ),
        llm=get_llm(orch_ctx),
        allow_delegation=False,
        verbose=True,
    )

    # ---- Tasks ----
    diag_summary = (
        f"Disease: {diag.disease_name}, severity={diag.severity}, "
        f"confidence={int(diag.confidence * 100)}%."
        if diag else "No disease diagnosis available."
    )

    market_summary = (
        f"Crop: {arb.crop}, volume: {arb.volume_kg} kg, origin: Nakuru."
        if arb else "No market data available."
    )

    task_diagnose = Task(
        description=(
            f"A Kenyan smallholder farmer's crop has been diagnosed by the AgriSync "
            f"vision AI (Llama-3.2-11B-Vision-Instruct on AMD MI300X).\n\n"
            f"Diagnosis summary: {diag_summary}\n\n"
            f"Live treatment data from AgriSync inventory:\n{treatment_data}\n\n"
            f"Write a concise 2-3 sentence treatment plan naming the most affordable "
            f"in-stock chemical, its exact dosage, application method, cost in KES, "
            f"and urgency level. If you need to verify availability, use the "
            f"Treatment Protocol Lookup tool."
        ),
        agent=agronomist,
        expected_output=(
            "A 2-3 sentence treatment plan: chemical name, dosage, application, "
            "KES cost, and urgency (treat within X days)."
        ),
    )

    task_market = Task(
        description=(
            f"A Kenyan farmer wants to sell their harvest. Details: {market_summary}\n\n"
            f"Live market prices from AgriSync database:\n{market_data}\n\n"
            f"Recommend the single best market to sell at, citing the net KES/kg "
            f"figure and how much more profit it offers versus the worst option. "
            f"Include transport distance and cost. Use the Market Price Lookup tool "
            f"if you need to verify or expand on the data above."
        ),
        agent=arbitrage_analyst,
        expected_output=(
            "A 2-3 sentence market recommendation: best market city, net KES/kg, "
            "distance, and extra profit vs worst option."
        ),
    )

    task_report = Task(
        description=(
            f"Combine the treatment plan and market recommendation into a single advisory "
            f"for farmer '{farmer}'. Write the FULL advisory TWICE: first in English, "
            f"then in Swahili (Kiswahili). Use plain language. Include KES figures. "
            f"End with a 160-character SMS in Swahili labelled 'SMS:'"
        ),
        agent=orchestrator,
        expected_output=(
            "English advisory paragraph, then Swahili advisory paragraph, "
            "then SMS: <160-char Swahili SMS>."
        ),
    )

    # ---- Crew ----
    crew = Crew(
        agents=[agronomist, arbitrage_analyst, orchestrator],
        tasks=[task_diagnose, task_market, task_report],
        process=Process.sequential,
        verbose=True,
    )

    raw_output = crew.kickoff()
    raw = raw_output.raw if hasattr(raw_output, "raw") else str(raw_output)
    return _parse_crew_output(raw, diag, arb, farmer)


# ---------------------------------------------------------------------------
# Output parser
# ---------------------------------------------------------------------------

def _strip_header(text: str, headers: tuple[str, ...]) -> str:
    lower = text.lower().lstrip()
    for h in headers:
        if lower.startswith(h):
            return text[text.lower().find(h) + len(h):].lstrip(": \n")
    return text


def _parse_crew_output(
    raw: str,
    diag: Optional[DiagnoseResponse],
    arb: Optional[ArbitrageResponse],
    farmer: str,
) -> tuple[str, str, str]:
    lines = [l.strip() for l in raw.split("\n") if l.strip()]

    sms = ""
    for line in lines:
        if line.upper().startswith("SMS:"):
            sms = line[4:].strip()[:160]
            break

    lower = raw.lower()
    sw_idx = max(lower.find("swahili"), lower.find("kiswahili"))
    if sw_idx > 20:
        english_block = raw[:sw_idx].strip()
        swahili_block = raw[sw_idx:].strip()
        english = _strip_header(english_block, ("english:",))
        sw_no_sms = "\n".join(
            l for l in swahili_block.split("\n")
            if not l.strip().upper().startswith("SMS:")
        ).strip()
        swahili = _strip_header(sw_no_sms, ("swahili:", "kiswahili:"))
    else:
        english = raw
        swahili = _fallback_swahili(diag, arb, farmer)

    if not sms:
        sms = _fallback_sms(diag, arb)

    return english or _fallback_english(diag, arb, farmer), swahili, sms[:160]


def _guess_crop(disease_name: str) -> str:
    lower = disease_name.lower()
    if "tomato" in lower:
        return "Tomato"
    if "maize" in lower:
        return "Maize"
    if "bean" in lower:
        return "Bean"
    if "potato" in lower:
        return "Potato"
    return "crop"


def _fallback_english(diag, arb, farmer) -> str:
    parts = [f"Dear {farmer},"]
    if diag:
        parts.append(
            f"Your crop shows {diag.disease_name} ({diag.severity} severity). "
            f"Apply {diag.recommendations[0].name if diag.recommendations else 'treatment'} immediately."
        )
    if arb:
        parts.append(
            f"Best market for {arb.volume_kg:.0f} kg of {arb.crop}: {arb.best_market} "
            f"(net KES {arb.markets[0].net_profit_kes:,.0f})."
        )
    parts.append("AgriSync — Powered by AMD MI300X.")
    return " ".join(parts)


def _fallback_swahili(diag, arb, farmer) -> str:
    parts = [f"Habari {farmer},"]
    if diag:
        sev_sw = {"high": "kali sana", "medium": "wastani", "low": "ndogo"}.get(
            diag.severity, diag.severity
        )
        parts.append(
            f"Mmea wako una {diag.disease_name} (ukali: {sev_sw}). "
            f"Tumia {diag.recommendations[0].name if diag.recommendations else 'dawa'} haraka."
        )
    if arb:
        parts.append(
            f"Kwa kilo {arb.volume_kg:.0f} za {arb.crop}, uza sokoni {arb.best_market} "
            f"(faida KES {arb.markets[0].net_profit_kes:,.0f})."
        )
    parts.append("AgriSync — Inayoendeshwa na AMD MI300X.")
    return " ".join(parts)


def _fallback_sms(diag, arb) -> str:
    parts = ["AgriSync:"]
    if diag:
        parts.append(f"Ugonjwa: {diag.disease_name}.")
    if arb:
        parts.append(f"Uza {arb.crop} {arb.best_market} KES {arb.markets[0].net_profit_kes:,.0f}.")
    return " ".join(parts)[:160]


# ---------------------------------------------------------------------------
# Async entry point
# ---------------------------------------------------------------------------

async def run_crew(
    diag: Optional[DiagnoseResponse],
    arb: Optional[ArbitrageResponse],
    farmer: str,
) -> tuple[str, str, str]:
    """Run the AgriSync CrewAI pipeline in a thread to avoid blocking the event loop."""
    return await asyncio.to_thread(_build_and_run, diag, arb, farmer)
