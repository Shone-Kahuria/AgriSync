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


def _run_samples(mode: str, fn: Callable[[], object]) -> dict:
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


def _print_table(rows: list[dict]) -> None:
    print("Mode       | Mean (ms) | p50   | p95   | p99")
    print("-----------+-----------+-------+-------+------")
    for row in rows:
        print(
            f"{row['mode']:<10} | "
            f"{row['mean_ms']:>9.1f} | "
            f"{row['p50_ms']:>5.1f} | "
            f"{row['p95_ms']:>5.1f} | "
            f"{row['p99_ms']:>4.1f}"
        )


def _save_results(rows: list[dict]) -> Path:
    repo_root = Path(__file__).resolve().parents[1]
    tasks_dir = repo_root / "tasks"
    tasks_dir.mkdir(exist_ok=True)
    output_path = tasks_dir / "benchmark_results.json"

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "runs_per_mode": RUNS,
        "vision_model": settings.vision_model,
        "gpu_available": _gpu_available(),
        "results": rows,
    }
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark AgriSync vision inference.")
    parser.add_argument("--mode", choices=["mock", "real", "both"], default="mock")
    args = parser.parse_args()

    rows: list[dict] = []
    if args.mode in {"mock", "both"}:
        rows.append(benchmark_mock())
    if args.mode in {"real", "both"}:
        result = benchmark_real()
        if result is not None:
            rows.append(result)

    if not rows:
        raise SystemExit("No benchmark rows produced.")

    _print_table(rows)
    output_path = _save_results(rows)
    print(f"\nSaved results to {output_path}")


if __name__ == "__main__":
    main()
