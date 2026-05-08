const COLORS = [
  { bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#bbf7d0", accent: "#15803d" },
  { bg: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "#bfdbfe", accent: "#1d4ed8" },
  { bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "#fde68a", accent: "#b45309" },
  { bg: "linear-gradient(135deg,#fdf4ff,#fae8ff)", border: "#e9d5ff", accent: "#7c3aed" },
];

const METRICS = [
  { emoji: "💰", value: "KES 4k",  label: "saved per trip",       source: "Kenya MoA 2025", ...COLORS[0] },
  { emoji: "⏱",  value: "24 hrs",  label: "faster expert access", source: "WHO rural data",  ...COLORS[1] },
  { emoji: "🦠",  value: "50+",    label: "diseases detected",    source: "LLaVA-v1.5-7B",  ...COLORS[2] },
  { emoji: "🏪",  value: "12",     label: "markets compared",     source: "KACE / WFP",      ...COLORS[3] },
];

export default function MetricsBanner() {
  return (
    <div style={s.grid}>
      {METRICS.map((m) => (
        <div key={m.label} style={{ ...s.card, background: m.bg, borderColor: m.border }}>
          <span style={s.emoji}>{m.emoji}</span>
          <span style={{ ...s.value, color: m.accent }}>{m.value}</span>
          <span style={s.label}>{m.label}</span>
          <span style={s.source}>{m.source}</span>
        </div>
      ))}
    </div>
  );
}

const s = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 20,
  },
  card: {
    borderRadius: 14,
    border: "1px solid",
    padding: "13px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
  },
  emoji: {
    fontSize: 20,
    lineHeight: 1,
    marginBottom: 5,
  },
  value: {
    fontSize: 23,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.025em",
  },
  label: {
    fontSize: 11,
    color: "#374151",
    fontWeight: 500,
    marginTop: 2,
    lineHeight: 1.3,
  },
  source: {
    fontSize: 9.5,
    color: "#9ca3af",
    marginTop: 3,
  },
};
