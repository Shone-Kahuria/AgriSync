export default function ResultCard({ title, accent = "#15803d", children }) {
  return (
    <div style={{ ...styles.card, borderLeft: `4px solid ${accent}` }}>
      {title && <p style={{ ...styles.title, color: accent }}>{title}</p>}
      {children}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "14px 16px",
    marginBottom: 12,
  },
  title: { fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", margin: "0 0 8px" },
};
