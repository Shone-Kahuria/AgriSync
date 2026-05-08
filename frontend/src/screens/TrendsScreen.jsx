import { useState } from "react";

/* KES/kg price data — 8 weeks (oldest → newest) */
const PRICE_DATA = {
  Maize:        { prices: [48, 50, 47, 52, 55, 53, 49, 54], unit: "kg",  color: "#fbbf24", emoji: "🌽" },
  Tomato:       { prices: [85, 92, 78, 110, 120, 95, 88, 112], unit: "kg", color: "#ef4444", emoji: "🍅" },
  Beans:        { prices: [95, 98, 90, 105, 110, 108, 95, 112], unit: "kg", color: "#22c55e", emoji: "🫘" },
  Potato:       { prices: [42, 45, 38, 50, 48, 44, 47, 52], unit: "kg",  color: "#a78bfa", emoji: "🥔" },
  Coffee:       { prices: [280, 295, 275, 310, 325, 315, 290, 320], unit: "kg", color: "#92400e", emoji: "☕" },
  Kale:         { prices: [18, 20, 17, 22, 25, 23, 19, 24], unit: "kg",  color: "#34d399", emoji: "🥬" },
  Onion:        { prices: [55, 60, 52, 68, 72, 65, 58, 70], unit: "kg",  color: "#fb923c", emoji: "🧅" },
  "Sweet Potato": { prices: [28, 30, 26, 34, 36, 32, 29, 35], unit: "kg", color: "#f97316", emoji: "🍠" },
};

const MARKET_PRICES = {
  Maize:  [{ city: "Nairobi", price: 56, trend: "+4%" }, { city: "Nakuru", price: 54, trend: "+2%" }, { city: "Kisumu", price: 51, trend: "+1%" }, { city: "Eldoret", price: 53, trend: "+3%" }],
  Tomato: [{ city: "Nairobi", price: 112, trend: "+31%" }, { city: "Nakuru", price: 98, trend: "+15%" }, { city: "Kisumu", price: 88, trend: "+8%" }, { city: "Eldoret", price: 95, trend: "+20%" }],
  Beans:  [{ city: "Nairobi", price: 115, trend: "+5%" }, { city: "Nakuru", price: 112, trend: "+3%" }, { city: "Kisumu", price: 105, trend: "-2%" }, { city: "Eldoret", price: 110, trend: "+4%" }],
  Potato: [{ city: "Nairobi", price: 54, trend: "+8%" }, { city: "Nakuru", price: 52, trend: "+6%" }, { city: "Kisumu", price: 48, trend: "+2%" }, { city: "Eldoret", price: 50, trend: "+4%" }],
  Coffee: [{ city: "Nairobi", price: 325, trend: "+4%" }, { city: "Nakuru", price: 310, trend: "+2%" }, { city: "Kisumu", price: 295, trend: "-1%" }, { city: "Eldoret", price: 315, trend: "+3%" }],
  Kale:   [{ city: "Nairobi", price: 25, trend: "+14%" }, { city: "Nakuru", price: 24, trend: "+9%" }, { city: "Kisumu", price: 20, trend: "0%" }, { city: "Eldoret", price: 22, trend: "+5%" }],
  Onion:  [{ city: "Nairobi", price: 72, trend: "+10%" }, { city: "Nakuru", price: 70, trend: "+8%" }, { city: "Kisumu", price: 65, trend: "+2%" }, { city: "Eldoret", price: 68, trend: "+6%" }],
  "Sweet Potato": [{ city: "Nairobi", price: 36, trend: "+13%" }, { city: "Nakuru", price: 35, trend: "+10%" }, { city: "Kisumu", price: 30, trend: "+4%" }, { city: "Eldoret", price: 33, trend: "+8%" }],
};

const WEEKS = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
const CROPS = Object.keys(PRICE_DATA);

export default function TrendsScreen() {
  const [selected, setSelected] = useState("Maize");

  const data        = PRICE_DATA[selected];
  const markets     = MARKET_PRICES[selected];
  const maxPrice    = Math.max(...data.prices);
  const minPrice    = Math.min(...data.prices);
  const latestPrice = data.prices[data.prices.length - 1];
  const prevPrice   = data.prices[data.prices.length - 2];
  const weekChange  = (((latestPrice - prevPrice) / prevPrice) * 100).toFixed(1);
  const weekUp      = latestPrice >= prevPrice;
  const bestWeek    = data.prices.indexOf(maxPrice) + 1;

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="page-header">
        <h2 className="page-title">Price Trends</h2>
        <p className="page-sub">8-week KES/kg history across major Kenyan markets</p>
      </div>

      {/* Crop selector */}
      <div className="trends-crop-tabs">
        {CROPS.map((c) => (
          <button
            key={c}
            className={`trends-crop-tab${selected === c ? " active" : ""}`}
            onClick={() => setSelected(c)}
          >
            {PRICE_DATA[c].emoji} {c}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="trend-summary-grid" style={{ marginBottom: 18 }}>
        <div className="trend-summary-card">
          <p className="trend-summary-val" style={{ color: "var(--g700)" }}>
            KES {latestPrice}
          </p>
          <p className="trend-summary-lbl">Current price / kg</p>
        </div>
        <div className="trend-summary-card">
          <p
            className="trend-summary-val"
            style={{ color: weekUp ? "#15803d" : "#dc2626" }}
          >
            {weekUp ? "▲" : "▼"} {Math.abs(weekChange)}%
          </p>
          <p className="trend-summary-lbl">Week-on-week change</p>
        </div>
        <div className="trend-summary-card">
          <p className="trend-summary-val" style={{ color: "#d97706" }}>
            Wk {bestWeek}
          </p>
          <p className="trend-summary-lbl">Best selling week</p>
        </div>
      </div>

      {/* Price bar chart */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          className="card-header"
          style={{ background: data.color + "18", borderBottom: `1px solid ${data.color}30` }}
        >
          <span className="card-header-icon">{data.emoji}</span>
          <span className="card-title" style={{ color: data.color }}>{selected} — 8-Week Price History</span>
        </div>
        <div className="card-body">
          <div className="price-chart">
            {data.prices.map((price, i) => {
              const pct      = (price / maxPrice) * 100;
              const isLatest = i === data.prices.length - 1;
              const isMax    = price === maxPrice;
              const barColor = isMax
                ? "linear-gradient(90deg, #15803d, #22c55e)"
                : isLatest
                ? `linear-gradient(90deg, ${data.color}cc, ${data.color})`
                : `linear-gradient(90deg, ${data.color}55, ${data.color}88)`;
              return (
                <div key={i} className="price-chart-row">
                  <span className="price-chart-label">{WEEKS[i]}</span>
                  <div className="price-chart-track">
                    <div
                      className="price-chart-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    >
                      <span className="price-chart-val">KES {price}</span>
                      {isMax && <span className="price-chart-dot"> 🏆</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="price-chart-axis">
            <span className="price-chart-tick">Min: KES {minPrice}</span>
            <span className="price-chart-tick">Max: KES {maxPrice}</span>
          </div>
        </div>
      </div>

      {/* This week's market prices */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          className="card-header"
          style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0" }}
        >
          <span className="card-header-icon">📊</span>
          <span className="card-title" style={{ color: "#15803d" }}>
            This Week — {selected} by Market
          </span>
        </div>
        <div className="card-body" style={{ padding: "4px 18px" }}>
          {markets.map((m) => {
            const up = m.trend.startsWith("+");
            const flat = m.trend === "0%";
            return (
              <div key={m.city} className="market-price-row">
                <span className="market-price-city">{m.city}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    className="market-price-trend"
                    style={{ color: flat ? "var(--n400)" : up ? "#15803d" : "#dc2626" }}
                  >
                    {flat ? "→" : up ? "▲" : "▼"} {m.trend}
                  </span>
                  <span className="market-price-value">KES {m.price}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selling advice */}
      <div
        className="card"
        style={{
          background: weekUp ? "var(--success-bg)" : "var(--warning-bg)",
          borderColor: weekUp ? "var(--success-border)" : "var(--warning-border)",
        }}
      >
        <div className="card-body">
          <p style={{ fontSize: 13, fontWeight: 700, color: weekUp ? "var(--g800)" : "#92400e", marginBottom: 4 }}>
            {weekUp ? "📈 Good time to sell" : "📉 Consider holding stock"}
          </p>
          <p style={{ fontSize: 12.5, color: "var(--n600)", lineHeight: 1.65 }}>
            {weekUp
              ? `${selected} prices are trending upward this week (+${weekChange}%). Nairobi offers the best rate at KES ${markets[0].price}/kg. Transport from Nakuru costs approx. KES 4.50/kg.`
              : `${selected} prices dipped ${Math.abs(weekChange)}% this week. If you can store safely, wait 1–2 weeks for prices to recover based on the seasonal pattern.`}
          </p>
        </div>
      </div>
    </div>
  );
}
