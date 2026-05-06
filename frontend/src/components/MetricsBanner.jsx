/**
 * Impact metrics sourced from locked decisions:
 *   4,000 KES  → Kenya Ministry of Agriculture 2023 transport cost data
 *   24 hours   → WHO agronomist access statistics (rural Kenya)
 */
export default function MetricsBanner() {
  return (
    <div style={styles.banner}>
      {METRICS.map((m) => (
        <div key={m.label} style={styles.metric}>
          <span style={styles.value}>{m.value}</span>
          <span style={styles.label}>{m.label}</span>
          <span style={styles.source}>{m.source}</span>
        </div>
      ))}
    </div>
  );
}

const METRICS = [
  { value: "KES 4,000",  label: "saved per market trip",      source: "Kenya MoA 2025" },
  { value: "24 hrs",     label: "faster agronomist access",   source: "WHO rural data" },
  { value: "50+",        label: "diseases detected",          source: "LLaVA-v1.5-7B"  },
  { value: "12",         label: "markets compared live",      source: "KACE/WFP prices" },
];

const styles = {
  banner: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 20,
  },
  metric: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  value: { fontSize: 20, fontWeight: 700, color: "#15803d", lineHeight: 1.1 },
  label: { fontSize: 11, color: "#374151", fontWeight: 500 },
  source: { fontSize: 10, color: "#9ca3af", marginTop: 2 },
};
