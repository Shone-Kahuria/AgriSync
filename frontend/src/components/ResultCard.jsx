export default function ResultCard({ title, accent = "#16a34a", icon = null, children }) {
  return (
    <div style={s.card}>
      {title && (
        <div
          style={{
            ...s.header,
            background: accent + "10",
            borderBottom: `1px solid ${accent}20`,
          }}
        >
          {icon && <span style={s.icon}>{icon}</span>}
          <span style={{ ...s.title, color: accent }}>{title}</span>
        </div>
      )}
      <div style={s.body}>{children}</div>
    </div>
  );
}

const s = {
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    marginBottom: 12,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 3px 10px rgba(0,0,0,0.04)",
    animation: "fadeUp 0.3s ease forwards",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 16px",
  },
  icon: {
    fontSize: 14,
    lineHeight: 1,
  },
  title: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
  },
  body: {
    padding: "14px 16px",
  },
};
