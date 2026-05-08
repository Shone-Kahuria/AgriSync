import { useEffect, useState } from "react";

export default function GpuStatsPanel({ inferenceMs = null }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch("/api/gpu-info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => null);
  }, []);

  const isReal = info?.backend === "ROCm";
  const utilPct = info?.utilization_pct ?? 0;

  return (
    <div
      style={{
        ...s.panel,
        background: isReal
          ? "linear-gradient(135deg,#fffbeb,#fef9ed)"
          : "#f9fafb",
        borderColor: isReal ? "#fde68a" : "#e5e7eb",
      }}
    >
      <div style={s.header}>
        <div style={s.left}>
          <div
            style={{
              ...s.statusDot,
              background: isReal ? "#22c55e" : "#d1d5db",
              boxShadow: isReal ? "0 0 7px #22c55e" : "none",
            }}
          />
          <span style={s.gpuName}>{isReal ? info.gpu : "Mock / CPU mode"}</span>
        </div>
        <span
          style={{
            ...s.badge,
            background: isReal ? "#e8601c" : "#e5e7eb",
            color: isReal ? "#fff" : "#6b7280",
          }}
        >
          {isReal ? "⚡ AMD MI300X" : "No GPU"}
        </span>
      </div>

      <div style={s.stats}>
        {isReal && <Stat label="VRAM" value={`${info.memory_gb} GB HBM3`} accent />}
        {isReal && info.utilization_pct != null && (
          <Stat label="Utilization" value={`${info.utilization_pct}%`} accent />
        )}
        {inferenceMs != null && inferenceMs > 0 && (
          <Stat label="Inference" value={`${inferenceMs.toFixed(0)} ms`} accent={isReal} />
        )}
        <Stat label="Backend" value={isReal ? "ROCm" : "CPU mock"} />
      </div>

      {isReal && (
        <div style={s.barTrack}>
          <div style={{ ...s.barFill, width: `${utilPct}%` }} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div style={s.stat}>
      <span style={s.statLabel}>{label}</span>
      <span style={{ ...s.statValue, color: accent ? "#b45309" : "#374151" }}>
        {value}
      </span>
    </div>
  );
}

const s = {
  panel: {
    border: "1px solid",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 14,
    transition: "all 0.3s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  left: { display: "flex", alignItems: "center", gap: 8 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    transition: "all 0.3s",
    flexShrink: 0,
  },
  gpuName: { fontSize: 12, fontWeight: 600, color: "#1f2937" },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.04em",
    padding: "3px 9px",
    borderRadius: 20,
  },
  stats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px 18px",
  },
  stat: { display: "flex", gap: 5, alignItems: "baseline" },
  statLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: { fontSize: 12, fontWeight: 700 },
  barTrack: {
    height: 4,
    background: "#fde68a",
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg,#f59e0b,#e8601c)",
    borderRadius: 2,
    transition: "width 0.7s ease",
  },
};
