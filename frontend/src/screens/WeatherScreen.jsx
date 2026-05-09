import { useState } from "react";

const FORECAST = [
  { day: "MON", emoji: "☀️",  hi: 28, lo: 18, rain: "5%",  today: false },
  { day: "TUE", emoji: "⛅",  hi: 26, lo: 17, rain: "20%", today: true  },
  { day: "WED", emoji: "🌧️", hi: 22, lo: 16, rain: "75%", today: false },
  { day: "THU", emoji: "🌦️", hi: 24, lo: 17, rain: "45%", today: false },
  { day: "FRI", emoji: "⛅",  hi: 27, lo: 18, rain: "15%", today: false },
  { day: "SAT", emoji: "☀️",  hi: 30, lo: 19, rain: "5%",  today: false },
  { day: "SUN", emoji: "☀️",  hi: 31, lo: 20, rain: "0%",  today: false },
];

const FARM_TIPS = [
  {
    icon: "🌱",
    text: "Tuesday morning is ideal for transplanting seedlings — moderate temperatures before tomorrow's rains.",
  },
  {
    icon: "💊",
    text: "Apply systemic fungicide today before Wednesday's rains to protect against late blight and downy mildew.",
  },
  {
    icon: "💧",
    text: "Heavy rains Wednesday — delay irrigation and check drainage channels to prevent waterlogging and root rot.",
  },
];

const PLANTING_CALENDAR = [
  { crop: "Maize",        window: "Mar – May",  progress: 0.9,  color: "#fbbf24" },
  { crop: "Cassava",      window: "Apr – Jun",  progress: 0.8,  color: "#60a5fa" },
  { crop: "Beans",        window: "Mar – Apr",  progress: 0.7,  color: "#22c55e" },
  { crop: "Tomato",       window: "Feb – Apr",  progress: 0.5,  color: "#ef4444" },
  { crop: "Potato",       window: "Apr – Jun",  progress: 0.85, color: "#a78bfa" },
  { crop: "Sorghum",      window: "Apr – May",  progress: 0.45, color: "#facc15" },
  { crop: "Sweet Potato", window: "Mar – Jun",  progress: 0.6,  color: "#fb923c" },
  { crop: "Groundnut",    window: "May – Jun",  progress: 0.35, color: "#f59e0b" },
];

const REGION_GROUPS = [
  {
    group: "East Africa",
    locs: ["Nairobi, Kenya", "Kampala, Uganda", "Dar es Salaam, Tanzania",
           "Addis Ababa, Ethiopia", "Kigali, Rwanda", "Mombasa, Kenya"],
  },
  {
    group: "West Africa",
    locs: ["Lagos, Nigeria", "Accra, Ghana", "Dakar, Senegal",
           "Abuja, Nigeria", "Kumasi, Ghana"],
  },
  {
    group: "Southern Africa",
    locs: ["Johannesburg, South Africa", "Cape Town, South Africa",
           "Lusaka, Zambia", "Harare, Zimbabwe", "Blantyre, Malawi"],
  },
  {
    group: "North Africa",
    locs: ["Cairo, Egypt", "Casablanca, Morocco", "Tunis, Tunisia"],
  },
  {
    group: "Central Africa",
    locs: ["Kinshasa, DRC", "Douala, Cameroon", "Luanda, Angola"],
  },
];

export default function WeatherScreen({ user }) {
  const [location, setLocation] = useState(user?.location || "Nairobi, Kenya");

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
          {REGION_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.locs.map((l) => <option key={l}>{l}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Current weather hero */}
      <div className="weather-hero">
        <span className="weather-hero-emoji">☁️</span>
        <p className="weather-location">📍 {location}</p>
        <p className="weather-temp">26°</p>
        <p className="weather-cond">Partly Cloudy</p>
        <div className="weather-stats">
          <span className="weather-stat">💧 Humidity <strong>68%</strong></span>
          <span className="weather-stat">💨 Wind <strong>14 km/h</strong></span>
          <span className="weather-stat">🌧️ Rain <strong>20%</strong></span>
          <span className="weather-stat">☀️ UV Index <strong>7</strong></span>
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
                  style={{ width: `${p.progress * 100}%`, background: p.color, opacity: 0.85 }}
                />
              </div>
              <span className="planting-window">{p.window}</span>
            </div>
          ))}
        </div>
      </div>

      {/* African seasonal overview */}
      <div className="card" style={{ marginTop: 4 }}>
        <div
          className="card-header"
          style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}
        >
          <span className="card-header-icon">🗓️</span>
          <span className="card-title" style={{ color: "#1d4ed8" }}>African Growing Seasons</span>
        </div>
        <div className="card-body">
          {[
            { season: "East Africa — Long Rains (MAR–MAY)",   crops: "Maize, Beans, Potatoes, Tomatoes, Cassava",         color: "#22c55e" },
            { season: "West Africa — Main Season (APR–JUL)",  crops: "Maize, Cassava, Groundnut, Rice, Sorghum",          color: "#f59e0b" },
            { season: "Southern Africa — Rains (NOV–MAR)",    crops: "Maize, Sorghum, Sunflower, Cotton, Sweet Potato",   color: "#3b82f6" },
            { season: "North Africa — Winter (OCT–APR)",      crops: "Wheat, Barley, Vegetables, Citrus, Olives",         color: "#8b5cf6" },
            { season: "Dry Season (irrigated) — Year-round",  crops: "Kale, Onions, Capsicum, Tomatoes, Leafy greens",    color: "#d97706" },
          ].map((s) => (
            <div
              key={s.season}
              style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--n100)" }}
            >
              <div style={{ width: 4, borderRadius: 2, background: s.color, alignSelf: "stretch", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n800)", marginBottom: 2 }}>{s.season}</p>
                <p style={{ fontSize: 12, color: "var(--n500)", lineHeight: 1.5 }}>{s.crops}</p>
              </div>
            </div>
          ))}
          <div style={{ padding: "10px 0 0", fontSize: 11, color: "var(--n400)", lineHeight: 1.5 }}>
            * Seasons shown are approximate. Local micro-climates and altitude variations may shift windows by 2–6 weeks. Always verify with regional agricultural extension offices.
          </div>
        </div>
      </div>
    </div>
  );
}
