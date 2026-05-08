import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import { arbitrage, getCrops } from "../api/client";

const FALLBACK_CROPS = [
  "Maize", "Tomato", "Beans", "Potato", "Cassava", "Coffee",
  "Kale", "Sweet Potato", "Sorghum", "Banana", "Wheat", "Onion",
];
const CITIES = [
  "Nakuru", "Nairobi", "Kisumu", "Eldoret",
  "Meru", "Nyeri", "Kakamega", "Kitale",
];

export default function MarketScreen({ onResult }) {
  const [crops, setCrops] = useState(FALLBACK_CROPS);
  const [crop, setCrop] = useState("Maize");
  const [volume, setVolume] = useState("");
  const [origin, setOrigin] = useState("Nakuru");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCrops()
      .then((data) => { if (data?.length) setCrops(data.map((c) => c.name)); })
      .catch(() => {});
  }, []);

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
    } catch {
      setError("Could not fetch market prices — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const maxProfit = result
    ? Math.max(...result.markets.map((m) => m.net_profit_kes), 1)
    : 1;

  return (
    <div style={s.screen}>
      <div style={s.pageHeader}>
        <h2 style={s.heading}>Best Market Finder</h2>
        <p style={s.sub}>Find the most profitable market for your harvest</p>
      </div>

      {/* Form card */}
      <div style={s.formCard}>
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>🌾 Crop type</label>
            <select
              style={s.select}
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            >
              {crops.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={s.fieldRow}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>📦 Volume (kg)</label>
              <input
                style={s.input}
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>📍 Your location</label>
              <select
                style={s.select}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" style={s.submitBtn} disabled={loading}>
            {loading ? "Finding best market…" : "Find Best Market →"}
          </button>
        </form>
      </div>

      {loading && <LoadingSpinner label="Calculating net profit per market…" />}

      {result && (
        <div style={s.results}>
          {/* Best market highlight card */}
          <div style={s.bestCard}>
            <div style={s.bestInfo}>
              <span style={s.bestEyebrow}>BEST MARKET</span>
              <p style={s.bestCity}>{result.best_market}</p>
              <p style={s.bestDiff}>
                KES {result.extra_profit_vs_worst_kes.toLocaleString()} more
                than the worst option
              </p>
            </div>
            <span style={s.trophyEmoji}>🏆</span>
          </div>

          <ResultCard title="Kiswahili · Swahili" icon="🇰🇪" accent="#0d9488">
            <p style={s.swahili}>{result.swahili_advice}</p>
          </ResultCard>

          <ResultCard title="Market Comparison" icon="📊" accent="#15803d">
            {result.markets.map((m, i) => (
              <div
                key={m.city}
                style={{
                  ...s.marketRow,
                  background: m.recommended ? "#f0fdf4" : "transparent",
                  borderRadius: m.recommended ? 10 : 0,
                  marginBottom: i === result.markets.length - 1 ? 0 : 6,
                }}
              >
                <div style={s.rankCol}>
                  {m.recommended ? (
                    <span style={s.rankEmoji}>🥇</span>
                  ) : (
                    <span style={s.rankNum}>#{i + 1}</span>
                  )}
                </div>

                <div style={s.marketData}>
                  <div style={s.marketTopRow}>
                    <p
                      style={{
                        ...s.marketCity,
                        color: m.recommended ? "#15803d" : "#111827",
                      }}
                    >
                      {m.city}
                    </p>
                    <p
                      style={{
                        ...s.netProfit,
                        color: m.recommended ? "#15803d" : "#374151",
                      }}
                    >
                      KES {m.net_profit_kes.toLocaleString()}
                    </p>
                  </div>
                  <p style={s.marketMeta}>
                    {m.market} · {m.distance_km} km · KES{" "}
                    {m.transport_cost_kes.toLocaleString()} transport
                  </p>
                  {/* Profit bar */}
                  <div style={s.barTrack}>
                    <div
                      style={{
                        ...s.barFill,
                        width: `${(m.net_profit_kes / maxProfit) * 100}%`,
                        background: m.recommended
                          ? "linear-gradient(90deg,#16a34a,#22c55e)"
                          : "#d1d5db",
                      }}
                    />
                  </div>
                </div>

                <div style={s.perKgCol}>
                  <span style={s.perKgValue}>{m.price_per_kg_kes}</span>
                  <span style={s.perKgUnit}>/kg</span>
                </div>
              </div>
            ))}
          </ResultCard>
        </div>
      )}
    </div>
  );
}

const s = {
  screen: { paddingBottom: 32 },

  pageHeader: { marginBottom: 18 },
  heading: {
    fontSize: 22,
    fontWeight: 800,
    color: "#111827",
    margin: "0 0 4px",
    letterSpacing: "-0.025em",
  },
  sub: { fontSize: 13, color: "#6b7280", margin: 0 },

  /* Form */
  formCard: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: "18px 16px",
    marginBottom: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 3px 10px rgba(0,0,0,0.03)",
  },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  fieldRow: { display: "flex", gap: 10 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: "#374151" },
  input: {
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
    background: "#f9fafb",
    transition: "border-color 0.15s",
    WebkitAppearance: "none",
  },
  select: {
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    background: "#f9fafb",
    outline: "none",
    cursor: "pointer",
    WebkitAppearance: "none",
    appearance: "none",
  },
  submitBtn: {
    padding: "14px 0",
    borderRadius: 12,
    background: "linear-gradient(135deg,#15803d,#16a34a)",
    color: "#fff",
    border: "none",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
    letterSpacing: "0.01em",
    transition: "opacity 0.15s",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#dc2626",
    background: "#fef2f2",
    borderRadius: 10,
    padding: "10px 14px",
    border: "1px solid #fecaca",
  },

  results: { animation: "fadeUp 0.35s ease forwards" },

  /* Best market highlight */
  bestCard: {
    background: "linear-gradient(135deg,#0f4024,#166534)",
    borderRadius: 18,
    padding: "20px 20px 18px",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 6px 24px rgba(15,64,36,0.35)",
  },
  bestInfo: {},
  bestEyebrow: {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bestCity: {
    fontSize: 24,
    fontWeight: 800,
    color: "#fff",
    margin: "0 0 5px",
    letterSpacing: "-0.025em",
  },
  bestDiff: {
    fontSize: 13,
    color: "#86efac",
    fontWeight: 500,
    margin: 0,
  },
  trophyEmoji: { fontSize: 44, lineHeight: 1 },

  swahili: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 1.75,
    margin: 0,
    fontStyle: "italic",
  },

  /* Market rows */
  marketRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 8px",
    transition: "background 0.2s",
  },
  rankCol: { width: 26, flexShrink: 0, paddingTop: 2 },
  rankEmoji: { fontSize: 17 },
  rankNum: { fontSize: 12, fontWeight: 700, color: "#9ca3af" },
  marketData: { flex: 1, minWidth: 0 },
  marketTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  marketCity: { fontSize: 14, fontWeight: 700, margin: 0 },
  netProfit: { fontSize: 15, fontWeight: 800, margin: 0, flexShrink: 0 },
  marketMeta: { fontSize: 11, color: "#6b7280", margin: "0 0 6px" },
  barTrack: { height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" },
  barFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.9s cubic-bezier(.22,.68,0,1.2)",
  },
  perKgCol: { textAlign: "right", flexShrink: 0, paddingTop: 2 },
  perKgValue: { fontSize: 13, fontWeight: 700, color: "#374151" },
  perKgUnit: { fontSize: 10, color: "#9ca3af" },
};
