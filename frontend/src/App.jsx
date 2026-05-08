import { useState } from "react";
import DiagnoseScreen from "./screens/DiagnoseScreen";
import MarketScreen from "./screens/MarketScreen";
import SummaryScreen from "./screens/SummaryScreen";
import MetricsBanner from "./components/MetricsBanner";

const TABS = [
  { id: "diagnose", label: "Diagnose", icon: "🔬" },
  { id: "market",   label: "Market",   icon: "📊" },
  { id: "report",   label: "Report",   icon: "📋" },
];

export default function App() {
  const [tab, setTab] = useState("diagnose");
  const [diagnoseResult, setDiagnoseResult] = useState(null);
  const [arbitrageResult, setArbitrageResult] = useState(null);

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.headerTop}>
          <div style={s.logo}>
            <div style={s.logoIconWrap}>
              <span style={s.logoEmoji}>🌿</span>
            </div>
            <div style={s.logoText}>
              <span style={s.logoName}>AgriSync</span>
              <span style={s.logoTagline}>AI Farm Advisor</span>
            </div>
          </div>
          <div style={s.badges}>
            <span style={s.amdBadge}>⚡ AMD MI300X</span>
            <span style={s.hackBadge}>2026</span>
          </div>
        </div>

        <div style={s.tabBar}>
          {TABS.map((t) => (
            <button
              key={t.id}
              style={tab === t.id ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setTab(t.id)}
            >
              <span style={s.tabIcon}>{t.icon}</span>
              <span style={tab === t.id ? { ...s.tabLabel, ...s.tabLabelActive } : s.tabLabel}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </header>

      <main style={s.main}>
        <MetricsBanner />

        {tab === "diagnose" && <DiagnoseScreen onResult={setDiagnoseResult} />}
        {tab === "market"   && <MarketScreen   onResult={setArbitrageResult} />}
        {tab === "report"   && (
          <SummaryScreen
            diagnoseResult={diagnoseResult}
            arbitrageResult={arbitrageResult}
          />
        )}
      </main>

      {diagnoseResult && arbitrageResult && tab !== "report" && (
        <button style={s.nudge} onClick={() => setTab("report")}>
          <span style={s.nudgeDot} />
          Both steps done — tap to generate your report →
        </button>
      )}
    </div>
  );
}

const s = {
  app: {
    maxWidth: 430,
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f0f9f4",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  },

  /* ── Header ── */
  header: {
    background: "linear-gradient(160deg, #0f4024 0%, #145228 50%, #15803d 100%)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 4px 20px rgba(15,64,36,0.35)",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px 10px",
  },

  /* Logo */
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(4px)",
  },
  logoEmoji: { fontSize: 22 },
  logoText: { display: "flex", flexDirection: "column", gap: 1 },
  logoName: {
    fontSize: 20,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.025em",
    lineHeight: 1.1,
  },
  logoTagline: {
    fontSize: 10,
    fontWeight: 500,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  },

  /* Badges */
  badges: { display: "flex", gap: 6, alignItems: "center" },
  amdBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.04em",
    background: "#e8601c",
    color: "#fff",
    padding: "4px 9px",
    borderRadius: 20,
    boxShadow: "0 2px 6px rgba(232,96,28,0.4)",
  },
  hackBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    padding: "4px 9px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.3)",
  },

  /* Tab bar */
  tabBar: {
    display: "flex",
    padding: "0 8px",
    gap: 2,
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "10px 6px 0",
    background: "transparent",
    border: "none",
    borderRadius: "10px 10px 0 0",
    cursor: "pointer",
    transition: "all 0.2s ease",
    paddingBottom: 10,
  },
  tabActive: {
    background: "#f0f9f4",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
  },
  tabIcon: { fontSize: 15 },
  tabLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: "0.01em",
  },
  tabLabelActive: {
    color: "#15803d",
    fontWeight: 700,
  },

  /* Main */
  main: {
    flex: 1,
    padding: "16px 16px 40px",
    overflowY: "auto",
  },

  /* Nudge */
  nudge: {
    position: "sticky",
    bottom: 0,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "linear-gradient(90deg, #15803d, #0d9488)",
    color: "#fff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 600,
    padding: "15px 16px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 -4px 20px rgba(21,128,61,0.25)",
    letterSpacing: "0.01em",
  },
  nudgeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#86efac",
    boxShadow: "0 0 6px #86efac",
    flexShrink: 0,
  },
};
