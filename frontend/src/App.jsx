import { useState } from "react";
import DiagnoseScreen from "./screens/DiagnoseScreen";
import MarketScreen from "./screens/MarketScreen";
import SummaryScreen from "./screens/SummaryScreen";
import MetricsBanner from "./components/MetricsBanner";

const TABS = [
  { id: "diagnose", label: "Diagnose",  icon: "🔬", sub: "AI crop disease" },
  { id: "market",   label: "Market",    icon: "📊", sub: "Best price finder" },
  { id: "report",   label: "Report",    icon: "📋", sub: "Bilingual advisory" },
];

export default function App() {
  const [tab, setTab] = useState("diagnose");
  const [diagnoseResult, setDiagnoseResult] = useState(null);
  const [arbitrageResult, setArbitrageResult] = useState(null);

  const bothDone = diagnoseResult && arbitrageResult;

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌿</div>
          <div>
            <div className="sidebar-logo-name">AgriSync</div>
            <div className="sidebar-logo-tag">AI Farm Advisor</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`sidebar-nav-item${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="sidebar-nav-icon">{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div>{t.label}</div>
                <div className="sidebar-nav-sub">{t.sub}</div>
              </div>
              {t.id === "report" && bothDone && tab !== "report" && (
                <span className="sidebar-nav-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`sidebar-badge sidebar-badge-amd`}>
            <span className="sidebar-badge-icon">⚡</span>
            <span className="sidebar-badge-text">AMD MI300X</span>
          </div>
          <div className="sidebar-badge">
            <span className="sidebar-badge-icon">🏆</span>
            <span className="sidebar-badge-text">Hackathon 2026</span>
          </div>
        </div>
      </aside>

      {/* ── App body ── */}
      <div className="app-body">
        {/* Topbar (mobile only) */}
        <header className="topbar">
          <div className="topbar-logo">
            <div className="topbar-logo-icon">🌿</div>
            <span className="topbar-logo-name">AgriSync</span>
          </div>
          <div className="topbar-badges">
            <span className="topbar-badge topbar-badge-amd">⚡ AMD</span>
            <span className="topbar-badge topbar-badge-year">2026</span>
          </div>
        </header>

        {/* Main content */}
        <main className="main-content">
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

        {/* Nudge banner */}
        {bothDone && tab !== "report" && (
          <button className="nudge-banner" onClick={() => setTab("report")}>
            <span className="nudge-dot" />
            Both steps done — generate your report →
          </button>
        )}

        {/* Bottom nav (mobile only) */}
        <nav className="bottom-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`bottom-nav-item${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="bottom-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "report" && bothDone && tab !== "report" && (
                <span className="bottom-nav-pip" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
