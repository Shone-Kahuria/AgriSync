import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import { arbitrage, getCrops } from "../api/client";
import { toast } from "../components/Toast";

const FALLBACK_CROPS = [
  "Maize", "Tomato", "Beans", "Potato", "Cassava", "Coffee",
  "Kale", "Sweet Potato", "Sorghum", "Banana", "Wheat", "Onion",
];
const CITY_GROUPS = [
  { group: "East Africa",     cities: ["Nairobi, KE", "Kampala, UG", "Dar es Salaam, TZ", "Nakuru, KE", "Kisumu, KE", "Mombasa, KE", "Arusha, TZ", "Eldoret, KE"] },
  { group: "West Africa",     cities: ["Lagos, NG", "Accra, GH", "Abuja, NG", "Dakar, SN", "Kumasi, GH", "Ibadan, NG"] },
  { group: "Southern Africa", cities: ["Johannesburg, ZA", "Cape Town, ZA", "Lusaka, ZM", "Harare, ZW", "Blantyre, MW"] },
  { group: "North Africa",    cities: ["Cairo, EG", "Casablanca, MA", "Khartoum, SD"] },
  { group: "Central Africa",  cities: ["Kinshasa, CD", "Douala, CM", "Luanda, AO"] },
];

export default function MarketScreen({ onResult }) {
  const [crops, setCrops]   = useState(FALLBACK_CROPS);
  const [crop, setCrop]     = useState("Maize");
  const [volume, setVolume] = useState("");
  const [origin, setOrigin] = useState("Nairobi, KE");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

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
    setError(null); setResult(null); setLoading(true);
    try {
      const data = await arbitrage(crop, Number(volume), origin);
      setResult(data);
      onResult?.(data);
      toast.success("Best market found!", `${data.best_market} offers the highest net profit.`);
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
    <div style={{ paddingBottom: 8 }}>
      <div className="page-header">
        <h2 className="page-title">Best Market Finder</h2>
        <p className="page-sub">Find the most profitable market for your harvest</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">🌾 Crop type</label>
            <select className="form-select" value={crop} onChange={(e) => setCrop(e.target.value)}>
              {crops.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">📦 Volume (kg)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">📍 Your location</label>
              <select className="form-select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {CITY_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.cities.map((c) => <option key={c}>{c}</option>)}
                </optgroup>
              ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Finding best market…" : "Find Best Market →"}
          </button>
        </form>
      </div>

      {loading && <LoadingSpinner label="Calculating net profit per market…" />}

      {result && (
        <div style={{ animation: "fadeUp .32s var(--e3) both" }}>
          <div className="best-market-hero">
            <div>
              <span className="best-eyebrow">Best Market</span>
              <p className="best-city">{result.best_market}</p>
              <p className="best-profit">
                KES {result.extra_profit_vs_worst_kes.toLocaleString()} more than worst option
              </p>
            </div>
            <span className="best-trophy">🏆</span>
          </div>

          <ResultCard title="Swahili · Local Advisory" icon="🌍" accent="#0d9488">
            <p className="swahili-text">{result.swahili_advice}</p>
          </ResultCard>

          <ResultCard title="Market Comparison" icon="📊" accent="#15803d">
            {result.markets.map((m, i) => (
              <div
                key={m.city}
                className="market-row"
                style={{
                  background: m.recommended ? "#f0fdf4" : "transparent",
                  marginBottom: i === result.markets.length - 1 ? 0 : 4,
                }}
              >
                <div className="market-rank">
                  {m.recommended
                    ? <span className="rank-emoji">🥇</span>
                    : <span className="rank-num">#{i + 1}</span>}
                </div>

                <div className="market-data">
                  <div className="market-top">
                    <p className="market-city" style={{ color: m.recommended ? "#15803d" : "#111827" }}>
                      {m.city}
                    </p>
                    <p className="market-net" style={{ color: m.recommended ? "#15803d" : "#374151" }}>
                      KES {m.net_profit_kes.toLocaleString()}
                    </p>
                  </div>
                  <p className="market-meta">
                    {m.market} · {m.distance_km} km · KES {m.transport_cost_kes.toLocaleString()} transport
                  </p>
                  <div className="profit-track">
                    <div
                      className="profit-fill"
                      style={{
                        width: `${(m.net_profit_kes / maxProfit) * 100}%`,
                        background: m.recommended
                          ? "linear-gradient(90deg,#16a34a,#22c55e)"
                          : "#d1d5db",
                      }}
                    />
                  </div>
                </div>

                <div className="market-pkg">
                  <span className="market-pkg-v">{m.price_per_kg_kes}</span>
                  <span className="market-pkg-u">/kg</span>
                </div>
              </div>
            ))}
          </ResultCard>
        </div>
      )}
    </div>
  );
}
