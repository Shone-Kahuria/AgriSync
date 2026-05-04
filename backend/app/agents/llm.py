"""
LLM wrappers for CrewAI 1.x agents.

Inherits from crewai.llms.base_llm.BaseLLM — the correct interface for
CrewAI 1.x (does NOT use LangChain's LLM base class).

Mock mode : AgriSyncMockLLM — deterministic, no API key, no GPU needed.
Real mode : HuggingFaceAgriSyncLLM — Mistral-7B-Instruct on AMD MI300X via ROCm.
"""
from __future__ import annotations

from typing import Any
from pydantic import Field, model_validator

from crewai.llms.base_llm import BaseLLM
from app.config import settings

# ---------------------------------------------------------------------------
# Shared bilingual templates
# ---------------------------------------------------------------------------

_AGRONOMIST_RESPONSE = (
    "Diagnosis confirmed: {disease} with {severity} severity. "
    "Recommended treatment: apply {chemical} at {dosage}. {application} "
    "Early intervention is critical — untreated {disease} can cause 40–70% yield loss."
)

_ARBITRAGE_RESPONSE = (
    "Market analysis complete. Best destination for {volume:.0f} kg of {crop}: "
    "{best_market} with net revenue of KES {net_profit:,.0f} after transport. "
    "This is KES {extra:,.0f} more than the least profitable option. "
    "Recommend transporting within 48 hours to lock in current prices."
)

_EN_REPORT = (
    "Dear {farmer}, here is your AgriSync advisory for today:\n\n"
    "DISEASE ALERT: Your {crop_hint} shows {disease} at {conf}% confidence "
    "({severity} severity). Apply {chemical} (KES {price}) immediately.\n\n"
    "MARKET ADVISORY: Sell {volume:.0f} kg of {crop} at {best_market} for "
    "net KES {net_profit:,.0f} — KES {extra:,.0f} more than the worst option.\n\n"
    "AgriSync — Powered by AMD MI300X. Data: Kenya MoA 2023."
)

_SW_REPORT = (
    "Habari {farmer}, hapa kuna ushauri wako wa AgriSync leo:\n\n"
    "TAHADHARI YA UGONJWA: {crop_hint} yako ina {disease} ({conf}% uhakika, "
    "ukali: {severity_sw}). Tumia {chemical} (KES {price}) haraka iwezekanavyo.\n\n"
    "USHAURI WA SOKO: Uza kilo {volume:.0f} za {crop} sokoni {best_market} — "
    "utapata KES {net_profit:,.0f}. Zaidi ya KES {extra:,.0f} kuliko soko baya zaidi.\n\n"
    "AgriSync — Inayoendeshwa na AMD MI300X. Data: Kenya MoA 2023."
)

_SEVERITY_SW = {"high": "kali sana", "medium": "wastani", "low": "ndogo"}


def _extract_text(messages: str | list) -> str:
    if isinstance(messages, str):
        return messages
    parts = []
    for m in messages:
        if isinstance(m, dict):
            parts.append(m.get("content", ""))
        else:
            parts.append(str(m))
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Mock LLM — correct CrewAI 1.x interface
# ---------------------------------------------------------------------------

class AgriSyncMockLLM(BaseLLM):
    """
    Deterministic mock LLM implementing crewai.llms.base_llm.BaseLLM.
    Returns structured bilingual farm advice without any model or API key.
    """
    model: str = "agrisync-mock-v1"
    context: dict = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _ensure_model_name(cls, data: Any) -> Any:
        # BaseLLM's before-validator requires model to be present in raw data
        if isinstance(data, dict) and not data.get("model"):
            data["model"] = "agrisync-mock-v1"
        return data

    def call(
        self,
        messages: str | list,
        tools: list | None = None,
        callbacks: list | None = None,
        available_functions: dict | None = None,
        **kwargs: Any,
    ) -> str:
        prompt = _extract_text(messages).lower()
        ctx = self.context
        role = ctx.get("role", "orchestrator")

        if role == "agronomist":
            return _AGRONOMIST_RESPONSE.format(
                disease=ctx.get("disease", "Unknown Disease"),
                severity=ctx.get("severity", "medium"),
                chemical=ctx.get("chemical", "recommended fungicide"),
                dosage=ctx.get("dosage", "as directed on label"),
                application=ctx.get("application", "Apply evenly to affected foliage."),
            )

        if role == "arbitrage":
            return _ARBITRAGE_RESPONSE.format(
                volume=ctx.get("volume", 0),
                crop=ctx.get("crop", "crop"),
                best_market=ctx.get("best_market", "Nairobi"),
                net_profit=ctx.get("net_profit", 0),
                extra=ctx.get("extra", 0),
            )

        # Orchestrator — always return BOTH English and Swahili sections
        import datetime
        kw = dict(
            farmer=ctx.get("farmer", "Farmer"),
            date=datetime.date.today().strftime("%d %b %Y"),
            crop_hint=ctx.get("crop_hint", "crop"),
            disease=ctx.get("disease", "unknown disease"),
            conf=ctx.get("conf", 85),
            severity=ctx.get("severity", "medium"),
            severity_sw=_SEVERITY_SW.get(ctx.get("severity", "medium"), "wastani"),
            chemical=ctx.get("chemical", "treatment"),
            price=ctx.get("price", 0),
            volume=ctx.get("volume", 0),
            crop=ctx.get("crop", "crop"),
            best_market=ctx.get("best_market", "Nairobi"),
            net_profit=ctx.get("net_profit", 0),
            extra=ctx.get("extra", 0),
        )
        sms_text = (
            f"AgriSync: {kw['disease']} detected. "
            f"Uza {kw['crop']} {kw['best_market']} KES {kw['net_profit']:,.0f}."
        )[:160]
        return (
            "English:\n" + _EN_REPORT.format(**kw) + "\n\n"
            "Swahili:\n" + _SW_REPORT.format(**kw) + "\n\n"
            f"SMS: {sms_text}"
        )

    async def acall(
        self,
        messages: str | list,
        tools: list | None = None,
        callbacks: list | None = None,
        available_functions: dict | None = None,
        **kwargs: Any,
    ) -> str:
        return self.call(messages, tools, callbacks, available_functions, **kwargs)

    def get_context_window_size(self) -> int:
        return 8192


# ---------------------------------------------------------------------------
# Real LLM — Mistral-7B-Instruct on AMD MI300X via HuggingFace + ROCm
# ---------------------------------------------------------------------------

_hf_pipeline = None


def _get_hf_pipeline():
    global _hf_pipeline
    if _hf_pipeline is not None:
        return _hf_pipeline
    import torch
    from transformers import pipeline as hf_pipeline

    print("[AgriSync] Loading Mistral-7B for CrewAI agents on AMD MI300X...")
    _hf_pipeline = hf_pipeline(
        "text-generation",
        model=settings.mistral_model_id,
        torch_dtype=torch.float16,
        device_map="cuda",
        max_new_tokens=512,
        temperature=0.3,
        do_sample=True,
    )
    print("[AgriSync] Mistral-7B loaded.")
    return _hf_pipeline


class HuggingFaceAgriSyncLLM(BaseLLM):
    """Wraps a local HuggingFace pipeline (Mistral-7B-Instruct on AMD MI300X)."""
    model: str = "mistralai/Mistral-7B-Instruct-v0.2"

    @model_validator(mode="before")
    @classmethod
    def _ensure_model_name(cls, data: Any) -> Any:
        if isinstance(data, dict) and not data.get("model"):
            data["model"] = "mistralai/Mistral-7B-Instruct-v0.2"
        return data

    def call(
        self,
        messages: str | list,
        tools: list | None = None,
        callbacks: list | None = None,
        available_functions: dict | None = None,
        **kwargs: Any,
    ) -> str:
        pipe = _get_hf_pipeline()
        prompt = _extract_text(messages)
        result = pipe(f"[INST] {prompt} [/INST]", return_full_text=False)
        return result[0]["generated_text"].strip()

    async def acall(
        self,
        messages: str | list,
        tools: list | None = None,
        callbacks: list | None = None,
        available_functions: dict | None = None,
        **kwargs: Any,
    ) -> str:
        import asyncio
        return await asyncio.to_thread(
            self.call, messages, tools, callbacks, available_functions, **kwargs
        )

    def get_context_window_size(self) -> int:
        return 32768


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_llm(context: dict | None = None) -> BaseLLM:
    if settings.use_mock_vision:
        return AgriSyncMockLLM(context=context or {})
    return HuggingFaceAgriSyncLLM()
