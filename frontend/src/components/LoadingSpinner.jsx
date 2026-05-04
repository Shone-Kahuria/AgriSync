export default function LoadingSpinner({ label = "Analyzing on AMD MI300X…" }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.ring} />
      <p style={styles.label}>{label}</p>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 14, padding: "32px 0",
  },
  ring: {
    width: 44, height: 44,
    border: "3px solid #e5e7eb",
    borderTopColor: "#16a34a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  label: { fontSize: 13, color: "#6b7280", margin: 0, textAlign: "center" },
};

// inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("agrisync-spin")) {
  const style = document.createElement("style");
  style.id = "agrisync-spin";
  style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}
