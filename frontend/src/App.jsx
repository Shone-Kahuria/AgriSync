import { useState } from "react";
import DiagnoseScreen from "./screens/DiagnoseScreen";
import MarketScreen from "./screens/MarketScreen";
import SummaryScreen from "./screens/SummaryScreen";
import MetricsBanner from "./components/MetricsBanner";

const TABS = [
  { id: "diagnose", label: "Diagnose", icon: "🔬" },
  { id: "market",   label: "Market",   icon: "📊" },
  { id: "summary",  label: "Report",   icon: "📋" },
];

export default function App() {
  const [tab, setTab] = useState("diagnose");
  const [diagnoseResult, setDiagnoseResult] = useState(null);
  const [arbitrageResult, setArbitrageResult] = useState(null);

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🌱</span>
            <span style={styles.logoText}>AgriSync</span>
          </div>
          <div style={styles.badges}>
            <span style={styles.amdBadge}>AMD MI300X</span>
            <span style={styles.hackBadge}>Hackathon 2026</span>
          </div>
        </div>
        {/* Tab bar inside header */}
        <div style={styles.tabRow}>
          {TABS.map((t) => (
            <button
              key={t.id}
              style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        {/* Impact metrics shown on every screen */}
        <MetricsBanner />

        {tab === "diagnose" && (
          <DiagnoseScreen onResult={setDiagnoseResult} />
        )}
        {tab === "market" && (
          <MarketScreen onResult={setArbitrageResult} />
        )}
        {tab === "summary" && (
          <SummaryScreen
            diagnoseResult={diagnoseResult}
            arbitrageResult={arbitrageResult}
          />
        )}
      </main>

      {/* Progress dots — show when both steps done */}
      {diagnoseResult && arbitrageResult && tab !== "summary" && (
        <div style={styles.nudge} onClick={() => setTab("summary")}>
          Both steps done — tap to generate your report →
        </div>
      )}
    </div>
  );
}

const styles = {
  app: {
    maxWidth: 430,
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f9fafb",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px 8px",
  },
  logo: { display: "flex", alignItems: "center", gap: 7 },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 18, fontWeight: 700, color: "#15803d" },
  badges: { display: "flex", gap: 6, alignItems: "center" },
  amdBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
    background: "#fef3c7", color: "#92400e",
    padding: "3px 8px", borderRadius: 20, border: "1px solid #fde68a",
  },
  hackBadge: {
    fontSize: 10, fontWeight: 600, letterSpacing: ".04em",
    background: "#ede9fe", color: "#5b21b6",
    padding: "3px 8px", borderRadius: 20, border: "1px solid #ddd6fe",
  },
  tabRow: {
    display: "flex",
    borderTop: "1px solid #f3f4f6",
  },
  tab: {
    flex: 1,
    padding: "9px 0",
    background: "none",
    border: "none",
    fontSize: 12,
    fontWeight: 500,
    color: "#9ca3af",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all .15s",
  },
  tabActive: {
    color: "#15803d",
    borderBottomColor: "#15803d",
    background: "#f0fdf4",
  },
  main: {
    flex: 1,
    padding: "16px 16px 32px",
    overflowY: "auto",
  },
  nudge: {
    position: "sticky",
    bottom: 0,
    background: "#15803d",
    color: "#fff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 500,
    padding: "12px 16px",
    cursor: "pointer",
  },
};
