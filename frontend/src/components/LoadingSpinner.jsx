export default function LoadingSpinner({ label = "Analyzing on AMD MI300X…" }) {
  return (
    <div style={s.wrap}>
      <div style={s.spinnerOuter}>
        <div style={s.spinnerRing} />
        <div style={s.spinnerRingInner} />
        <div style={s.spinnerDot} />
      </div>
      <div style={s.textBlock}>
        <p style={s.label}>{label}</p>
        <p style={s.sub}>Powered by AMD ROCm GPU acceleration</p>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
    padding: "36px 0",
  },
  spinnerOuter: {
    position: "relative",
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerRing: {
    position: "absolute",
    inset: 0,
    border: "3px solid rgba(22,163,74,0.15)",
    borderTopColor: "#16a34a",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
  spinnerRingInner: {
    position: "absolute",
    inset: 8,
    border: "2px solid rgba(13,148,136,0.15)",
    borderBottomColor: "#0d9488",
    borderRadius: "50%",
    animation: "spinReverse 1.1s linear infinite",
  },
  spinnerDot: {
    width: 14,
    height: 14,
    background: "linear-gradient(135deg,#16a34a,#0d9488)",
    borderRadius: "50%",
    animation: "pulse 1s ease-in-out infinite",
    boxShadow: "0 2px 8px rgba(22,163,74,0.45)",
  },
  textBlock: {
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#15803d",
    margin: "0 0 4px",
    letterSpacing: "-0.01em",
  },
  sub: {
    fontSize: 11,
    color: "#9ca3af",
    margin: 0,
  },
};
