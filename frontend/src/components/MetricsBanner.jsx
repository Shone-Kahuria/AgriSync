const METRICS = [
  { emoji: "💰", value: "KES 4k",  label: "saved per trip",       source: "Kenya MoA 2025",
    bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#bbf7d0", accent: "#15803d" },
  { emoji: "⏱",  value: "24 hrs",  label: "faster expert access", source: "WHO rural data",
    bg: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "#bfdbfe", accent: "#1d4ed8" },
  { emoji: "🦠",  value: "50+",    label: "diseases detected",    source: "LLaVA-v1.5-7B",
    bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "#fde68a", accent: "#b45309" },
  { emoji: "🏪",  value: "12",     label: "markets compared",     source: "KACE / WFP",
    bg: "linear-gradient(135deg,#fdf4ff,#fae8ff)", border: "#e9d5ff", accent: "#7c3aed" },
];

export default function MetricsBanner() {
  return (
    <div className="metrics-grid">
      {METRICS.map((m) => (
        <div
          key={m.label}
          className="metric-card"
          style={{ background: m.bg, borderColor: m.border }}
        >
          <span className="metric-emoji">{m.emoji}</span>
          <span className="metric-value" style={{ color: m.accent }}>{m.value}</span>
          <span className="metric-label">{m.label}</span>
          <span className="metric-source">{m.source}</span>
        </div>
      ))}
    </div>
  );
}
