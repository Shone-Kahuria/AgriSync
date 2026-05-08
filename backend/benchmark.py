from __future__ import annotations

import argparse
import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from app.config import settings
from app.vision.inference import run_inference
from app.vision.plant_classifier import classify_disease

RUNS = 10

# A tiny valid PNG. The benchmark measures pipeline latency, not image content.
BLANK_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
    "/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)


def _percentile(samples: list[float], pct: float) -> float:
    ordered = sorted(samples)
    index = round((len(ordered) - 1) * pct)
    return ordered[index]


def _summarize(mode: str, samples: list[float]) -> dict:
    return {
        "mode": mode,
        "runs": len(samples),
        "mean_ms": round(statistics.mean(samples), 1),
        "p50_ms": round(statistics.median(samples), 1),
        "p95_ms": round(_percentile(samples, 0.95), 1),
        "p99_ms": round(_percentile(samples, 0.99), 1),
    }


def _measure(fn: Callable[[], object]) -> float:
    started = time.perf_counter()
    fn()
    return (time.perf_counter() - started) * 1000


def _run_samples(mode: str, fn: Callable[[], object], warmup: bool = True) -> dict:
    if warmup:
        fn()
    samples = [_measure(fn) for _ in range(RUNS)]
    return _summarize(mode, samples)


def _gpu_available() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except Exception:
        return False


def benchmark_mock() -> dict:
    original = settings.use_mock_vision
    settings.use_mock_vision = True
    try:
        return _run_samples("Mock (CPU)", lambda: run_inference(BLANK_PNG_B64))
    finally:
        settings.use_mock_vision = original


def benchmark_real() -> dict | None:
    if not _gpu_available():
        print("Skipping real benchmark: no ROCm/CUDA-compatible GPU is visible to PyTorch.")
        return None

    original = settings.use_mock_vision
    settings.use_mock_vision = False
    try:
        return _run_samples("AMD MI300X", lambda: run_inference(BLANK_PNG_B64))
    finally:
        settings.use_mock_vision = original


def benchmark_mock_vision_stage() -> dict:
    original = settings.use_mock_vision
    settings.use_mock_vision = True
    try:
        return _run_samples("LLaVA / Llama (mock)", lambda: run_inference(BLANK_PNG_B64))
    finally:
        settings.use_mock_vision = original


def benchmark_classifier() -> dict:
    warmup_result = classify_disease(BLANK_PNG_B64)
    if warmup_result.get("gpu_used") in {"classifier unavailable", "classifier error"}:
        return {
            "mode": "PlantVillage classifier",
            "runs": 0,
            "mean_ms": None,
            "p50_ms": None,
            "p95_ms": None,
            "p99_ms": None,
            "status": warmup_result["gpu_used"],
        }
    return _run_samples("PlantVillage classifier", lambda: classify_disease(BLANK_PNG_B64), warmup=False)


def benchmark_combined(use_real_fallback: bool) -> dict | None:
    if use_real_fallback and not _gpu_available():
        print("Skipping combined real benchmark: no ROCm/CUDA-compatible GPU is visible to PyTorch.")
        return None

    original = settings.use_mock_vision
    settings.use_mock_vision = not use_real_fallback
    try:
        return _run_samples(
            "Combined worst case",
            lambda: (classify_disease(BLANK_PNG_B64), run_inference(BLANK_PNG_B64)),
        )
    finally:
        settings.use_mock_vision = original


def _print_table(rows: list[dict]) -> None:
    print("Mode                      | Mean (ms) | p50   | p95   | p99")
    print("--------------------------+-----------+-------+-------+------")
    for row in rows:
        print(
            f"{row['mode'][:24]:<24} | "
            f"{_fmt_ms(row['mean_ms'], 9)} | "
            f"{_fmt_ms(row['p50_ms'], 5)} | "
            f"{_fmt_ms(row['p95_ms'], 5)} | "
            f"{_fmt_ms(row['p99_ms'], 4)}"
        )


def _fmt_ms(value: float | None, width: int) -> str:
    if value is None:
        return "n/a".rjust(width)
    return f"{value:>{width}.1f}"


def _save_results(rows: list[dict]) -> Path:
    repo_root = Path(__file__).resolve().parents[1]
    tasks_dir = repo_root / "tasks"
    tasks_dir.mkdir(exist_ok=True)
    output_path = tasks_dir / "benchmark_results.json"

    existing_rows: list[dict] = []
    if output_path.exists():
        try:
            existing_payload = json.loads(output_path.read_text(encoding="utf-8"))
            existing_rows = existing_payload.get("results", [])
        except json.JSONDecodeError:
            existing_rows = []

    merged = {row["mode"]: row for row in existing_rows}
    for row in rows:
        merged[row["mode"]] = row

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "runs_per_mode": RUNS,
        "vision_model": settings.vision_model,
        "gpu_available": _gpu_available(),
        "results": list(merged.values()),
    }
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark AgriSync vision inference.")
    parser.add_argument("--mode", choices=["mock", "real", "both", "classifier"], default="mock")
    args = parser.parse_args()

    rows: list[dict] = []
    if args.mode in {"mock", "both"}:
        rows.append(benchmark_mock())
    if args.mode in {"real", "both"}:
        result = benchmark_real()
        if result is not None:
            rows.append(result)
    if args.mode == "classifier":
        rows.append(benchmark_classifier())
        fallback = benchmark_real()
        rows.append(fallback if fallback is not None else benchmark_mock_vision_stage())
        combined = benchmark_combined(use_real_fallback=fallback is not None)
        if combined is not None:
            rows.append(combined)

    if not rows:
        raise SystemExit("No benchmark rows produced.")

    _print_table(rows)
    output_path = _save_results(rows)
    print(f"\nSaved results to {output_path}")


if __name__ == "__main__":
    main()
