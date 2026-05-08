const ALERTS = [
  {
    icon: "🦠",
    title: "Maize Lethal Necrosis — Rift Valley Alert",
    body: "Outbreak reported in Nakuru and Kericho counties. Scout your maize fields for chlorotic streaking and mosaic symptoms.",
    badge: "HIGH RISK",
    badgeColor: "#dc2626", badgeBg: "#fee2e2",
    borderColor: "#fecaca",
  },
  {
    icon: "📈",
    title: "Tomato prices up 31% in Nairobi",
    body: "Nairobi Wakulima Market is offering KES 112/kg this week — highest in 8 weeks. Consider selling now.",
    badge: "MARKET TIP",
    badgeColor: "#15803d", badgeBg: "#dcfce7",
    borderColor: "#bbf7d0",
  },
  {
    icon: "🌧️",
    title: "Light rains expected Thursday–Friday",
    body: "Good conditions for transplanting seedlings. Apply systemic fungicide before rains to prevent late blight spread.",
    badge: "WEATHER",
    badgeColor: "#1d4ed8", badgeBg: "#dbeafe",
    borderColor: "#bfdbfe",
  },
];

const SHORTCUTS = [
  { icon: "🔬", title: "Diagnose Crop",   sub: "AI disease detection",    id: "diagnose" },
  { icon: "📊", title: "Find Market",     sub: "Best price near you",     id: "market"   },
  { icon: "📈", title: "Price Trends",    sub: "Historical prices",       id: "trends"   },
  { icon: "🌤️", title: "Weather",         sub: "Forecast & planting",     id: "weather"  },
  { icon: "📚", title: "Crop Guide",      sub: "Disease library",         id: "guide"    },
  { icon: "📋", title: "Summary Report",  sub: "Bilingual advisory",      id: "report"   },
];

const RECENT_ACTIVITY = [
  { icon: "🔬", bg: "#fef3c7", label: "Tomato Late Blight diagnosed", sub: "87% confidence · Yesterday" },
  { icon: "📊", bg: "#dcfce7", label: "Maize sold — Nairobi best price", sub: "KES 54/kg · 2 days ago" },
  { icon: "📋", bg: "#dbeafe", label: "Bilingual report generated", sub: "English + Swahili · 3 days ago" },
];

export default function DashboardScreen({ user, onNavigate, diagnoseResult, arbitrageResult }) {
  const greeting = getGreeting();
  const firstName = (user?.name || "Farmer").split(" ")[0];

  const diagCount  = Number(localStorage.getItem("agrisync_diag_count")  || 0);
  const mktCount   = Number(localStorage.getItem("agrisync_mkt_count")   || 0);
  const savedKes   = diagCount * 420 + mktCount * 380;

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Welcome hero */}
      <div className="dash-welcome">
        <p className="dash-welcome-greeting">{greeting}</p>
        <p className="dash-welcome-name">{firstName} 👋</p>
        <div className="dash-welcome-meta">
          <span className="dash-welcome-location">📍 {user?.location || "Nakuru"}</span>
          <span className="dash-welcome-weather">🌤️ 22°C · Partly Cloudy</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="dash-stat-row" style={{ marginBottom: 22 }}>
        <div className="dash-stat">
          <div className="dash-stat-val">{diagCount}</div>
          <div className="dash-stat-lbl">Diagnoses run</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-val">{mktCount}</div>
          <div className="dash-stat-lbl">Markets checked</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-val" style={{ fontSize: savedKes > 999 ? 16 : 22 }}>
            {savedKes > 0 ? `${(savedKes / 1000).toFixed(1)}k` : "—"}
          </div>
          <div className="dash-stat-lbl">KES saved est.</div>
        </div>
      </div>

      {/* Alerts */}
      <p className="dash-section-title">Live Alerts</p>
      {ALERTS.map((a) => (
        <div
          key={a.title}
          className="dash-alert"
          style={{ borderColor: a.borderColor }}
        >
          <span className="dash-alert-icon">{a.icon}</span>
          <div style={{ flex: 1 }}>
            <p className="dash-alert-title">{a.title}</p>
            <p className="dash-alert-body">{a.body}</p>
            <span
              className="dash-alert-badge"
              style={{ background: a.badgeBg, color: a.badgeColor }}
            >
              {a.badge}
            </span>
          </div>
        </div>
      ))}

      {/* Quick actions */}
      <p className="dash-section-title" style={{ marginTop: 22 }}>Quick Actions</p>
      <div className="dash-shortcuts">
        {SHORTCUTS.map((s) => (
          <button
            key={s.id}
            className="dash-shortcut"
            onClick={() => onNavigate(s.id)}
          >
            <span className="dash-shortcut-icon">{s.icon}</span>
            <span className="dash-shortcut-title">{s.title}</span>
            <span className="dash-shortcut-sub">{s.sub}</span>
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <p className="dash-section-title">Recent Activity</p>
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: "4px 18px" }}>
          {RECENT_ACTIVITY.map((a, i) => (
            <div key={i} className="dash-activity-item">
              <div className="dash-activity-dot" style={{ background: a.bg }}>
                {a.icon}
              </div>
              <div>
                <p className="dash-activity-title">{a.label}</p>
                <p className="dash-activity-sub">{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}
