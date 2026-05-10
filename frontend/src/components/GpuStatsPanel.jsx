import { useEffect, useState } from "react";

export default function GpuStatsPanel({ inferenceMs = null }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch("/api/gpu-info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => null);
  }, [inferenceMs]);

  const isReal  = info?.backend === "ROCm";
  const utilPct = info?.utilization_pct ?? 0;

  return (
    <div
      className="gpu-panel"
      style={{
        background: isReal ? "linear-gradient(135deg,#fffbeb,#fef9ed)" : "#f9fafb",
        borderColor: isReal ? "#fde68a" : "#e5e7eb",
      }}
    >
      <div className="gpu-header">
        <div className="gpu-left">
          <div
            className="gpu-status-dot"
            style={{
              background: isReal ? "#22c55e" : "#d1d5db",
              boxShadow: isReal ? "0 0 7px #22c55e" : "none",
            }}
          />
          <span className="gpu-name">{isReal ? info.gpu : "Mock / CPU mode"}</span>
        </div>
        <span
          className="gpu-badge"
          style={{
            background: isReal ? "#e8601c" : "#e5e7eb",
            color: isReal ? "#fff" : "#6b7280",
          }}
        >
          {isReal ? "⚡ AMD MI300X" : "No GPU"}
        </span>
      </div>

      <div className="gpu-stats">
        {isReal && <Stat label="VRAM" value={`${info.memory_gb} GB HBM3`} accent />}
        {isReal && info.utilization_pct != null && (
          <Stat label="Utilization" value={`${info.utilization_pct}%`} accent />
        )}
        {inferenceMs != null && inferenceMs > 0 && (
          <Stat label="Inference" value={`${inferenceMs.toFixed(0)} ms`} accent={isReal} />
        )}
        {info?.last_inference_ms > 0 && (
          <Stat label="GPU time" value={`${info.last_inference_ms.toFixed(0)} ms`} accent={isReal} />
        )}
        {info?.inference_count > 0 && (
          <Stat label="Total runs" value={info.inference_count} />
        )}
        <Stat label="Backend" value={isReal ? "ROCm" : "CPU mock"} />
      </div>

      {isReal && (
        <div className="gpu-bar-track" style={{ background: "#fde68a" }}>
          <div className="gpu-bar-fill" style={{ width: `${utilPct}%` }} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className="gpu-stat">
      <span className="gpu-stat-lbl">{label}</span>
      <span className="gpu-stat-val" style={{ color: accent ? "#b45309" : "#334155" }}>
        {value}
      </span>
    </div>
  );
}
