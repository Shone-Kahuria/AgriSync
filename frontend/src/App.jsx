import { useState, useRef } from "react";

import SplashScreen    from "./screens/SplashScreen";
import AuthScreen      from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import DiagnoseScreen  from "./screens/DiagnoseScreen";
import MarketScreen    from "./screens/MarketScreen";
import SummaryScreen   from "./screens/SummaryScreen";
import TrendsScreen    from "./screens/TrendsScreen";
import WeatherScreen   from "./screens/WeatherScreen";
import CropGuideScreen from "./screens/CropGuideScreen";
import ProfileScreen   from "./screens/ProfileScreen";
import MetricsBanner   from "./components/MetricsBanner";
import ToastContainer  from "./components/Toast";
import OnboardingTour  from "./components/OnboardingTour";

/* ── Navigation structure ──────────────────────────────────────── */
const SIDEBAR_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard",  icon: "🏠", sub: "Home & alerts" },
    ],
  },
  {
    label: "Farming Tools",
    items: [
      { id: "diagnose", label: "Diagnose",       icon: "🔬", sub: "AI crop disease" },
      { id: "market",   label: "Find Market",    icon: "📊", sub: "Best price finder" },
      { id: "report",   label: "Report",         icon: "📋", sub: "Bilingual advisory" },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "trends",  label: "Price Trends", icon: "📈", sub: "8-week history" },
      { id: "weather", label: "Weather",      icon: "🌤️", sub: "Forecast & calendar" },
      { id: "guide",   label: "Crop Guide",   icon: "📚", sub: "Disease library" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: "👤", sub: "Settings & history" },
    ],
  },
];

/* Bottom nav — 5 most-used tabs */
const BOTTOM_TABS = [
  { id: "dashboard", label: "Home",    icon: "🏠" },
  { id: "diagnose",  label: "Diagnose", icon: "🔬" },
  { id: "market",    label: "Market",  icon: "📊" },
  { id: "guide",     label: "Guide",   icon: "📚" },
  { id: "profile",   label: "Profile", icon: "👤" },
];

const BOTTOM_TAB_IDS = BOTTOM_TABS.map((t) => t.id);

/* Pages that show MetricsBanner */
const SHOW_METRICS = new Set(["diagnose", "market"]);

export default function App() {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem("agrisync_splashed") === "1"
  );

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agrisync_user")); }
    catch { return null; }
  });

  const [tab, setTab]                   = useState("dashboard");
  const [diagnoseResult, setDiagnoseResult] = useState(null);
  const [arbitrageResult, setArbitrageResult] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* Swipe gesture refs */
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  /* Splash — once per browser session */
  if (!splashDone) {
    return (
      <SplashScreen
        onDone={() => {
          sessionStorage.setItem("agrisync_splashed", "1");
          setSplashDone(true);
        }}
      />
    );
  }

  /* Auth gate */
  if (!user) {
    return (
      <AuthScreen
        onAuth={(u) => {
          setUser(u);
          if (!localStorage.getItem("agrisync_onboarded")) {
            setShowOnboarding(true);
          }
        }}
      />
    );
  }

  const bothDone = diagnoseResult && arbitrageResult;

  function onDiagnoseResult(data) {
    setDiagnoseResult(data);
    const c = Number(localStorage.getItem("agrisync_diag_count") || 0) + 1;
    localStorage.setItem("agrisync_diag_count", c);
  }
  function onMarketResult(data) {
    setArbitrageResult(data);
    const c = Number(localStorage.getItem("agrisync_mkt_count") || 0) + 1;
    localStorage.setItem("agrisync_mkt_count", c);
  }

  /* Swipe navigation between bottom tabs */
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = BOTTOM_TAB_IDS.indexOf(tab);
    if (idx === -1) return;
    if (dx < 0 && idx < BOTTOM_TAB_IDS.length - 1) setTab(BOTTOM_TAB_IDS[idx + 1]);
    if (dx > 0 && idx > 0)                          setTab(BOTTOM_TAB_IDS[idx - 1]);
  }

  function renderScreen() {
    switch (tab) {
      case "dashboard": return (
        <DashboardScreen
          user={user}
          onNavigate={setTab}
          diagnoseResult={diagnoseResult}
          arbitrageResult={arbitrageResult}
        />
      );
      case "diagnose": return <DiagnoseScreen onResult={onDiagnoseResult} />;
      case "market":   return <MarketScreen   onResult={onMarketResult} />;
      case "report":   return (
        <SummaryScreen
          diagnoseResult={diagnoseResult}
          arbitrageResult={arbitrageResult}
        />
      );
      case "trends":  return <TrendsScreen />;
      case "weather": return <WeatherScreen user={user} />;
      case "guide":   return <CropGuideScreen />;
      case "profile": return (
        <ProfileScreen
          user={user}
          onUserUpdate={(u) => setUser(u)}
          onLogout={() => setUser(null)}
        />
      );
      default: return null;
    }
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop ≥768px) ─────────────────────────── */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌿</div>
          <div>
            <div className="sidebar-logo-name">AgriSync</div>
            <div className="sidebar-logo-tag">AI Farm Advisor</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: 4 }}>
              <p style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em",
                color: "rgba(255,255,255,.3)", textTransform: "uppercase",
                padding: "10px 14px 4px", margin: 0,
              }}>
                {section.label}
              </p>
              {section.items.map((t) => (
                <button
                  key={t.id}
                  className={`sidebar-nav-item${tab === t.id ? " active" : ""}`}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  aria-label={t.label}
                >
                  <span className="sidebar-nav-icon">{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div>{t.label}</div>
                    <div className="sidebar-nav-sub">{t.sub}</div>
                  </div>
                  {t.id === "report" && bothDone && tab !== "report" && (
                    <span className="sidebar-nav-dot" aria-label="New report available" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-badge sidebar-badge-amd">
            <span className="sidebar-badge-icon">⚡</span>
            <span className="sidebar-badge-text">AMD MI300X</span>
          </div>
          <div className="sidebar-badge">
            <span className="sidebar-badge-icon">🏆</span>
            <span className="sidebar-badge-text">Hackathon 2026</span>
          </div>
        </div>
      </aside>

      {/* ── App body ─────────────────────────────────────────── */}
      <div
        className="app-body"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile topbar */}
        <header className="topbar" role="banner">
          <div className="topbar-logo">
            <div className="topbar-logo-icon">🌿</div>
            <span className="topbar-logo-name">AgriSync</span>
          </div>
          <div className="topbar-badges">
            <span className="topbar-badge topbar-badge-amd">⚡ AMD</span>
            <span className="topbar-badge topbar-badge-year">2026</span>
          </div>
        </header>

        {/* Main content — keyed so it fades on tab switch */}
        <main className="main-content" id="main-content">
          {SHOW_METRICS.has(tab) && <MetricsBanner />}
          <div key={tab} className="page-transition">
            {renderScreen()}
          </div>
        </main>

        {/* Nudge banner — only when both diagnose + market are done */}
        {bothDone && tab !== "report" && (
          <button className="nudge-banner" onClick={() => setTab("report")}>
            <span className="nudge-dot" />
            Both steps done — generate your bilingual report →
          </button>
        )}

        {/* Mobile bottom nav */}
        <nav className="bottom-nav" role="navigation" aria-label="Bottom navigation">
          {BOTTOM_TABS.map((t) => (
            <button
              key={t.id}
              className={`bottom-nav-item${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              aria-label={t.label}
            >
              <span className="bottom-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "dashboard" && bothDone && tab !== "report" && (
                <span className="bottom-nav-pip" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Global toast layer */}
      <ToastContainer />

      {/* First-run onboarding overlay */}
      {showOnboarding && (
        <OnboardingTour onDone={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
