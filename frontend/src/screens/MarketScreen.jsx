import { useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import { arbitrage } from "../api/client";

const CROPS = ["Maize", "Tomato", "Beans", "Potato"];
const CITIES = ["Nakuru", "Nairobi", "Kisumu"];

export default function MarketScreen({ onResult }) {
  const [crop, setCrop] = useState("Maize");
  const [volume, setVolume] = useState("");
  const [origin, setOrigin] = useState("Nakuru");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!volume || isNaN(volume) || Number(volume) <= 0) {
      setError("Please enter a valid harvest volume.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await arbitrage(crop, Number(volume), origin);
      setResult(data);
      onResult?.(data);
    } catch (e) {
      setError("Could not fetch market prices — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.screen}>
      <h2 style={styles.heading}>Best Market Finder</h2>
      <p style={styles.sub}>Enter your harvest to find the most profitable market</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Crop</label>
          <select style={styles.select} value={crop} onChange={(e) => setCrop(e.target.value)}>
            {CROPS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Harvest volume (kg)</label>
          <input
            style={styles.input}
            type="number" min="1" placeholder="e.g. 500"
            value={volume} onChange={(e) => setVolume(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Your location</label>
          <select style={styles.select} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={styles.submitBtn} disabled={loading}>
          Find Best Market
        </button>
      </form>

      {loading && <LoadingSpinner label="Calculating net profit per market…" />}

      {result && (
        <>
          <ResultCard title="Market Recommendation" accent="#15803d">
            <p style={styles.bestMarket}>
              Best: <strong>{result.best_market}</strong>
            </p>
            <p style={styles.extraProfit}>
              KES {result.extra_profit_vs_worst_kes.toLocaleString()} more than worst option
            </p>
          </ResultCard>

          <ResultCard title="Swahili / Kiswahili" accent="#0d9488">
            <p style={styles.swahili}>{result.swahili_advice}</p>
          </ResultCard>

          <ResultCard title="All Markets — Ranked">
            {result.markets.map((m, i) => (
              <div
                key={m.city}
                style={{
                  ...styles.marketRow,
                  background: m.recommended ? "#f0fdf4" : "transparent",
                  borderRadius: m.recommended ? 8 : 0,
                }}
              >
                <div style={styles.rank}>
                  {m.recommended ? "🥇" : `#${i + 1}`}
                </div>
                <div style={styles.marketInfo}>
                  <p style={styles.marketName}>{m.city}</p>
                  <p style={styles.marketDetail}>{m.market}</p>
                  <p style={styles.marketDetail}>{m.distance_km} km · transport KES {m.transport_cost_kes.toLocaleString()}</p>
                </div>
                <div style={styles.marketProfit}>
                  <p style={{ ...styles.netProfit, color: m.recommended ? "#15803d" : "#374151" }}>
                    KES {m.net_profit_kes.toLocaleString()}
                  </p>
                  <p style={styles.priceLabel}>{m.price_per_kg_kes}/kg</p>
                </div>
              </div>
            ))}
          </ResultCard>
        </>
      )}
    </div>
  );
}

const styles = {
  screen: { padding: "0 0 32px" },
  heading: { fontSize: 20, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  sub: { fontSize: 13, color: "#6b7280", margin: "0 0 18px" },
  form: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 12, fontWeight: 500, color: "#374151" },
  input: {
    padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: 15, outline: "none",
  },
  select: {
    padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: 15, background: "#fff", outline: "none",
  },
  submitBtn: {
    padding: "12px 0", borderRadius: 10,
    background: "#15803d", color: "#fff", border: "none",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  error: { fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "10px 14px" },
  bestMarket: { fontSize: 18, color: "#111827", margin: "0 0 4px" },
  extraProfit: { fontSize: 13, color: "#15803d", fontWeight: 600, margin: 0 },
  swahili: { fontSize: 14, color: "#1f2937", lineHeight: 1.6, margin: 0, fontStyle: "italic" },
  marketRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 8px" },
  rank: { fontSize: 16, width: 26, flexShrink: 0, paddingTop: 2 },
  marketInfo: { flex: 1 },
  marketName: { fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" },
  marketDetail: { fontSize: 11, color: "#6b7280", margin: 0 },
  marketProfit: { textAlign: "right", flexShrink: 0 },
  netProfit: { fontSize: 14, fontWeight: 700, margin: "0 0 2px" },
  priceLabel: { fontSize: 11, color: "#6b7280", margin: 0 },
};
