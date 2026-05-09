import { useState } from "react";

/* USD-equivalent prices per kg (×100 = cents, displayed as $) for pan-African comparison */
const PRICE_DATA = {
  Maize:          { prices: [37, 38, 36, 40, 42, 41, 38, 42], unit: "kg", color: "#fbbf24", emoji: "🌽" },
  Tomato:         { prices: [65, 71, 60, 85, 92, 73, 68, 86], unit: "kg", color: "#ef4444", emoji: "🍅" },
  Beans:          { prices: [73, 75, 69, 81, 85, 83, 73, 86], unit: "kg", color: "#22c55e", emoji: "🫘" },
  Cassava:        { prices: [28, 30, 26, 33, 35, 32, 29, 34], unit: "kg", color: "#60a5fa", emoji: "🍠" },
  Potato:         { prices: [32, 35, 29, 38, 37, 34, 36, 40], unit: "kg", color: "#a78bfa", emoji: "🥔" },
  Coffee:         { prices: [215, 227, 211, 238, 250, 242, 223, 246], unit: "kg", color: "#92400e", emoji: "☕" },
  Groundnut:      { prices: [55, 58, 52, 63, 67, 64, 57, 65], unit: "kg", color: "#f59e0b", emoji: "🥜" },
  "Sweet Potato": { prices: [22, 23, 20, 26, 28, 25, 22, 27], unit: "kg", color: "#f97316", emoji: "🍠" },
};

const MARKET_PRICES = {
  Maize:     [{ city: "Nairobi, KE", price: 43, trend: "+5%" }, { city: "Lagos, NG", price: 41, trend: "+3%" }, { city: "Accra, GH", price: 39, trend: "+2%" }, { city: "Lusaka, ZM", price: 38, trend: "+1%" }],
  Tomato:    [{ city: "Nairobi, KE", price: 86, trend: "+28%" }, { city: "Lagos, NG", price: 78, trend: "+18%" }, { city: "Cairo, EG", price: 72, trend: "+10%" }, { city: "Joburg, ZA", price: 80, trend: "+22%" }],
  Beans:     [{ city: "Nairobi, KE", price: 88, trend: "+4%" }, { city: "Kampala, UG", price: 86, trend: "+2%" }, { city: "Accra, GH", price: 81, trend: "-2%" }, { city: "Douala, CM", price: 84, trend: "+3%" }],
  Cassava:   [{ city: "Lagos, NG", price: 35, trend: "+6%" }, { city: "Kinshasa, CD", price: 32, trend: "+4%" }, { city: "Accra, GH", price: 34, trend: "+5%" }, { city: "Dar es Salaam, TZ", price: 30, trend: "+2%" }],
  Potato:    [{ city: "Nairobi, KE", price: 41, trend: "+9%" }, { city: "Joburg, ZA", price: 40, trend: "+7%" }, { city: "Cairo, EG", price: 37, trend: "+3%" }, { city: "Kampala, UG", price: 38, trend: "+5%" }],
  Coffee:    [{ city: "Nairobi, KE", price: 250, trend: "+4%" }, { city: "Addis Ababa, ET", price: 240, trend: "+2%" }, { city: "Kampala, UG", price: 227, trend: "-1%" }, { city: "Dar es Salaam, TZ", price: 242, trend: "+3%" }],
  Groundnut: [{ city: "Lagos, NG", price: 67, trend: "+11%" }, { city: "Accra, GH", price: 65, trend: "+9%" }, { city: "Dakar, SN", price: 62, trend: "+5%" }, { city: "Nairobi, KE", price: 63, trend: "+7%" }],
  "Sweet Potato": [{ city: "Kampala, UG", price: 28, trend: "+12%" }, { city: "Nairobi, KE", price: 27, trend: "+10%" }, { city: "Blantyre, MW", price: 24, trend: "+4%" }, { city: "Harare, ZW", price: 25, trend: "+6%" }],
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
        <p className="page-sub">8-week African commodity prices (¢USD/kg equivalent)</p>
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
            ¢{latestPrice}
          </p>
          <p className="trend-summary-lbl">Current price / kg</p>
        </div>
        <div className="trend-summary-card">
          <p className="trend-summary-val" style={{ color: weekUp ? "#15803d" : "#dc2626" }}>
            {weekUp ? "▲" : "▼"} {Math.abs(weekChange)}%
          </p>
          <p className="trend-summary-lbl">Week-on-week change</p>
        </div>
        <div className="trend-summary-card">
          <p className="trend-summary-val" style={{ color: "#d97706" }}>Wk {bestWeek}</p>
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
                      <span className="price-chart-val">¢{price}</span>
                      {isMax && <span className="price-chart-dot"> 🏆</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="price-chart-axis">
            <span className="price-chart-tick">Min: ¢{minPrice}/kg</span>
            <span className="price-chart-tick">Max: ¢{maxPrice}/kg</span>
          </div>
        </div>
      </div>

      {/* This week's market prices across Africa */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header" style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0" }}>
          <span className="card-header-icon">🌍</span>
          <span className="card-title" style={{ color: "#15803d" }}>This Week — {selected} Across Africa</span>
        </div>
        <div className="card-body" style={{ padding: "4px 18px" }}>
          {markets.map((m) => {
            const up   = m.trend.startsWith("+");
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
                  <span className="market-price-value">¢{m.price}</span>
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
              ? `${selected} prices are trending upward this week (+${weekChange}%). ${markets[0].city} offers the best rate at ¢${markets[0].price}/kg. Compare with local markets for final sell decision.`
              : `${selected} prices dipped ${Math.abs(weekChange)}% this week. If you can store safely, consider waiting 1–2 weeks for prices to recover based on seasonal patterns.`}
          </p>
        </div>
      </div>
    </div>
  );
}
