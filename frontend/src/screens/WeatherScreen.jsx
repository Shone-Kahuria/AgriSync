import { useState } from "react";

const FORECAST = [
  { day: "MON", emoji: "☀️",  hi: 24, lo: 14, rain: "5%",  today: false },
  { day: "TUE", emoji: "⛅",  hi: 22, lo: 13, rain: "20%", today: true  },
  { day: "WED", emoji: "🌧️", hi: 18, lo: 12, rain: "75%", today: false },
  { day: "THU", emoji: "🌦️", hi: 20, lo: 13, rain: "45%", today: false },
  { day: "FRI", emoji: "⛅",  hi: 23, lo: 14, rain: "15%", today: false },
  { day: "SAT", emoji: "☀️",  hi: 26, lo: 15, rain: "5%",  today: false },
  { day: "SUN", emoji: "☀️",  hi: 27, lo: 15, rain: "0%",  today: false },
];

const FARM_TIPS = [
  {
    icon: "🌱",
    text: "Tuesday morning is ideal for transplanting seedlings — moderate temperatures and low wind before tomorrow's rains.",
  },
  {
    icon: "💊",
    text: "Apply systemic fungicide today before Wednesday's rains to protect against late blight and downy mildew.",
  },
  {
    icon: "💧",
    text: "Heavy rains Wednesday — delay irrigation and check drainage channels to prevent waterlogging.",
  },
];

const PLANTING_CALENDAR = [
  { crop: "Maize",       window: "Mar – May",  progress: 0.9,  color: "#fbbf24" },
  { crop: "Beans",       window: "Mar – Apr",  progress: 0.7,  color: "#22c55e" },
  { crop: "Tomato",      window: "Feb – Apr",  progress: 0.5,  color: "#ef4444" },
  { crop: "Potato",      window: "Apr – Jun",  progress: 0.85, color: "#a78bfa" },
  { crop: "Kale",        window: "Year-round", progress: 1.0,  color: "#34d399" },
  { crop: "Sweet Potato",window: "Mar – Jun",  progress: 0.6,  color: "#fb923c" },
  { crop: "Sorghum",     window: "Apr – May",  progress: 0.45, color: "#facc15" },
  { crop: "Cassava",     window: "Apr – Jun",  progress: 0.4,  color: "#60a5fa" },
];

const LOCATIONS = [
  "Nakuru", "Nairobi", "Kisumu", "Eldoret",
  "Meru", "Nyeri", "Kakamega", "Kitale",
];

export default function WeatherScreen({ user }) {
  const [location, setLocation] = useState(user?.location || "Nakuru");

  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 className="page-title">Weather & Calendar</h2>
          <p className="page-sub">Forecast + optimal planting windows</p>
        </div>
        <select
          className="form-select"
          style={{ width: "auto", fontSize: 12, padding: "7px 10px" }}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Current weather hero */}
      <div className="weather-hero">
        <span className="weather-hero-emoji">☁️</span>
        <p className="weather-location">📍 {location} · Kenya</p>
        <p className="weather-temp">22°</p>
        <p className="weather-cond">Partly Cloudy</p>
        <div className="weather-stats">
          <span className="weather-stat">💧 Humidity <strong>68%</strong></span>
          <span className="weather-stat">💨 Wind <strong>12 km/h</strong></span>
          <span className="weather-stat">🌧️ Rain <strong>20%</strong></span>
          <span className="weather-stat">☀️ UV Index <strong>6</strong></span>
        </div>
      </div>

      {/* 7-day forecast */}
      <p className="dash-section-title">7-Day Forecast</p>
      <div className="forecast-scroll">
        {FORECAST.map((f) => (
          <div key={f.day} className={`forecast-day${f.today ? " today" : ""}`}>
            <p className="forecast-day-name">{f.today ? "TODAY" : f.day}</p>
            <p className="forecast-day-emoji">{f.emoji}</p>
            <p className="forecast-day-hi">{f.hi}°</p>
            <p className="forecast-day-lo">{f.lo}°</p>
            <p className="forecast-day-rain">{f.rain}</p>
          </div>
        ))}
      </div>

      {/* Farming tips */}
      <p className="dash-section-title">Today's Farming Advice</p>
      {FARM_TIPS.map((tip, i) => (
        <div key={i} className="farm-tip">
          <span className="farm-tip-icon">{tip.icon}</span>
          <p className="farm-tip-text">{tip.text}</p>
        </div>
      ))}

      {/* Planting calendar */}
      <p className="dash-section-title" style={{ marginTop: 22 }}>Planting Calendar — {location}</p>
      <div className="card">
        <div className="card-body" style={{ padding: "6px 18px" }}>
          {PLANTING_CALENDAR.map((p) => (
            <div key={p.crop} className="planting-row">
              <span className="planting-crop">{p.crop}</span>
              <div className="planting-bar">
                <div
                  className="planting-fill"
                  style={{
                    width: `${p.progress * 100}%`,
                    background: p.color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="planting-window">{p.window}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal overview */}
      <div className="card" style={{ marginTop: 4 }}>
        <div
          className="card-header"
          style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}
        >
          <span className="card-header-icon">🗓️</span>
          <span className="card-title" style={{ color: "#1d4ed8" }}>Kenya Growing Seasons</span>
        </div>
        <div className="card-body">
          {[
            { season: "Long Rains (MAR–MAY)", crops: "Maize, Beans, Potatoes, Tomatoes", color: "#22c55e" },
            { season: "Short Rains (OCT–DEC)", crops: "Sorghum, Cowpeas, Sweet Potatoes", color: "#3b82f6" },
            { season: "Dry Season (JAN–FEB, JUN–SEP)", crops: "Irrigated Kale, Onions, Capsicum", color: "#f59e0b" },
          ].map((s) => (
            <div
              key={s.season}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "10px 0", borderBottom: "1px solid var(--n100)",
              }}
            >
              <div style={{ width: 4, borderRadius: 2, background: s.color, alignSelf: "stretch", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n800)", marginBottom: 2 }}>
                  {s.season}
                </p>
                <p style={{ fontSize: 12, color: "var(--n500)", lineHeight: 1.5 }}>{s.crops}</p>
              </div>
            </div>
          ))}
          <div style={{ padding: "10px 0 0", fontSize: 11, color: "var(--n400)", lineHeight: 1.5 }}>
            * Calendar based on Rift Valley highlands. Coastal and arid regions may vary by 2–4 weeks.
          </div>
        </div>
      </div>
    </div>
  );
}
