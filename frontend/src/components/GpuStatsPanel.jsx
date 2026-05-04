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

  return (
    <div style={{ ...styles.panel, borderColor: isReal ? "#fde68a" : "#e5e7eb" }}>
      <div style={styles.row}>
        <div style={styles.left}>
          <span style={{ ...styles.dot, background: isReal ? "#22c55e" : "#9ca3af" }} />
          <span style={styles.label}>{isReal ? info.gpu : "Mock mode"}</span>
        </div>
        <span style={{ ...styles.badge, background: isReal ? "#fef3c7" : "#f3f4f6", color: isReal ? "#92400e" : "#6b7280" }}>
          {isReal ? "AMD MI300X" : "No GPU"}
        </span>
      </div>

      <div style={styles.stats}>
        {isReal && (
          <Stat label="VRAM" value={`${info.memory_gb} GB HBM3`} />
        )}
        {isReal && info.utilization_pct != null && (
          <Stat label="GPU util" value={`${info.utilization_pct}%`} accent={info.utilization_pct > 50} />
        )}
        {inferenceMs != null && inferenceMs > 0 && (
          <Stat label="Inference" value={`${inferenceMs.toFixed(0)} ms`} accent={isReal} />
        )}
        <Stat label="Backend" value={isReal ? "ROCm" : "CPU mock"} />
      </div>

      {isReal && (
        <div style={styles.utilBar}>
          <div style={{ ...styles.utilFill, width: `${info.utilization_pct ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color: accent ? "#16a34a" : "#374151" }}>{value}</span>
    </div>
  );
}

const styles = {
  panel: {
    border: "1px solid",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#fffbeb",
    marginBottom: 14,
  },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  left: { display: "flex", alignItems: "center", gap: 7 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  label: { fontSize: 12, fontWeight: 600, color: "#1f2937" },
  badge: { fontSize: 10, fontWeight: 700, letterSpacing: ".06em", padding: "2px 8px", borderRadius: 20 },
  stats: { display: "flex", flexWrap: "wrap", gap: "4px 16px" },
  stat: { display: "flex", gap: 4, alignItems: "baseline" },
  statLabel: { fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" },
  statValue: { fontSize: 12, fontWeight: 600 },
  utilBar: { height: 3, background: "#fde68a", borderRadius: 2, marginTop: 8, overflow: "hidden" },
  utilFill: { height: "100%", background: "#f59e0b", borderRadius: 2, transition: "width .5s" },
};
