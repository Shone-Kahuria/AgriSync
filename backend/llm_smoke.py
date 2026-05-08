from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx


PAYLOAD = {
    "farmer_name": "Wanjiku",
    "origin_city": "Nakuru",
    "diagnose_result": {
        "disease_name": "Tomato Late Blight",
        "confidence": 0.91,
        "symptoms": "Dark brown lesions and white mold on underside of leaves.",
        "severity": "high",
        "recommendations": [],
        "swahili_summary": "Nyanya ina dalili za ukungu wa kuchelewa.",
        "gpu_used": "AMD MI300X",
    },
    "arbitrage_result": {
        "crop": "Tomato",
        "volume_kg": 500,
        "markets": [
            {
                "market": "Wakulima Market",
                "city": "Nairobi",
                "price_per_kg_kes": 72,
                "distance_km": 160,
                "transport_cost_kes": 6,
                "net_profit_kes": 33000,
                "recommended": True,
            }
        ],
        "best_market": "Nairobi",
        "extra_profit_vs_worst_kes": 12000,
        "swahili_advice": "Uza Nairobi kwa faida bora.",
    },
}


def _estimate_tokens(text: str) -> int:
    return len(text.split())


def _looks_mock(response: dict) -> bool:
    combined = "\n".join(
        str(response.get(key, ""))
        for key in ("english_report", "swahili_report", "sms_text")
    )
    mock_markers = [
        "Dear Wanjiku, here is your AgriSync advisory for today:",
        "AgriSync — Powered by AMD MI300X. Data: Kenya MoA 2023.",
        "Habari Wanjiku, hapa kuna ushauri wako wa AgriSync leo:",
    ]
    return any(marker in combined for marker in mock_markers)


def _save_result(result: dict) -> Path:
    repo_root = Path(__file__).resolve().parents[1]
    output_path = repo_root / "tasks" / "benchmark_results.json"
    output_path.parent.mkdir(exist_ok=True)

    payload = {}
    if output_path.exists():
        try:
            payload = json.loads(output_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            payload = {}

    payload["llm_smoke"] = result
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test AgriSync /report LLM generation.")
    parser.add_argument("--url", default="http://localhost:8000/report")
    parser.add_argument("--timeout", type=float, default=180.0)
    parser.add_argument("--api-key", default=os.getenv("API_KEY", ""))
    args = parser.parse_args()

    headers = {"Content-Type": "application/json"}
    if args.api_key:
        headers["X-API-Key"] = args.api_key

    started = time.perf_counter()
    with httpx.Client(timeout=args.timeout) as client:
        response = client.post(args.url, headers=headers, json=PAYLOAD)
    elapsed_s = time.perf_counter() - started
    response.raise_for_status()

    data = response.json()
    generated_text = "\n".join(
        str(data.get(key, ""))
        for key in ("english_report", "swahili_report", "sms_text")
    )
    tokens = _estimate_tokens(generated_text)
    tokens_per_sec = tokens / elapsed_s if elapsed_s else 0.0
    looks_mock = _looks_mock(data)

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "url": args.url,
        "response_seconds": round(elapsed_s, 2),
        "estimated_tokens": tokens,
        "estimated_tokens_per_sec": round(tokens_per_sec, 2),
        "looks_like_mock_template": looks_mock,
        "recommendation": (
            "Use real Mistral for demo if quality is good."
            if not looks_mock and elapsed_s <= 30
            else "Use mock report step for live demo if real Mistral is too slow or template-like."
        ),
    }

    output_path = _save_result(result)
    print(json.dumps(result, indent=2))
    print(f"\nSaved LLM smoke result to {output_path}")


if __name__ == "__main__":
    main()
