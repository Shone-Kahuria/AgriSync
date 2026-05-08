import { useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import { getReport, registerFarmer, getFarmerHistory } from "../api/client";

export default function SummaryScreen({ diagnoseResult, arbitrageResult }) {
  const [farmerName, setFarmerName] = useState(
    () => localStorage.getItem("agrisync_name") || ""
  );
  const [phone, setPhone] = useState(
    () => localStorage.getItem("agrisync_phone") || ""
  );
  const [loading, setLoading]           = useState(false);
  const [report, setReport]             = useState(null);
  const [error, setError]               = useState(null);
  const [history, setHistory]           = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const hasData = diagnoseResult || arbitrageResult;

  function handleNameChange(val) {
    setFarmerName(val);
    localStorage.setItem("agrisync_name", val);
  }
  function handlePhoneChange(val) {
    setPhone(val);
    localStorage.setItem("agrisync_phone", val);
  }

  async function handleGenerate() {
    setError(null); setLoading(true);
    try {
      const data = await getReport(diagnoseResult, arbitrageResult, farmerName, phone || null);
      setReport(data);
      if (phone) registerFarmer(phone, farmerName || null, null, null).catch(() => {});
    } catch {
      setError("Could not generate report — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewHistory() {
    if (!phone) return;
    setHistoryLoading(true); setHistory(null);
    try {
      setHistory(await getFarmerHistory(phone));
    } catch {
      setHistory({ error: "No history found for this number." });
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="page-header">
        <h2 className="page-title">Summary Report</h2>
        <p className="page-sub">Bilingual advisory combining diagnosis &amp; market data</p>
      </div>

      {!hasData && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-title">No data yet</p>
          <p className="empty-text">
            Complete the <strong>Diagnose</strong> and/or <strong>Market</strong> steps
            first to generate a combined report.
          </p>
        </div>
      )}

      {hasData && !report && (
        <>
          <div className="chip-row">
            {diagnoseResult && (
              <span className="chip" style={{ background: "#fef3c7", borderColor: "#fde68a", color: "#92400e" }}>
                🔬 {diagnoseResult.disease_name}
              </span>
            )}
            {arbitrageResult && (
              <span className="chip" style={{ background: "#dcfce7", borderColor: "#bbf7d0", color: "#166534" }}>
                📊 Best: {arbitrageResult.best_market}
              </span>
            )}
          </div>

          <div className="form-card">
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 2px", letterSpacing: "-.01em" }}>
                Farmer Details
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                Optional — used to personalise your report
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                placeholder="e.g. Wanjiku Kamau"
                value={farmerName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone number (for SMS)</label>
              <input
                className="form-input"
                placeholder="+254 7XX XXX XXX"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              <span className="form-hint">📱 Swahili SMS via Africa's Talking API</span>
            </div>

            {error && (
              <div className="error-box">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-blue" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "Generate Report →"}
            </button>

            {phone && (
              <button className="btn btn-ghost-purple" onClick={handleViewHistory} disabled={historyLoading}>
                {historyLoading ? "Loading…" : "📜 View My History"}
              </button>
            )}
          </div>
        </>
      )}

      {history && (
        <ResultCard title="Farming History" icon="📜" accent="#7c3aed">
          {history.error ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>{history.error}</p>
          ) : (
            <>
              <div className="hist-header">
                <span className="hist-name">{history.farmer?.name || "Farmer"}</span>
                <div className="hist-pills">
                  <span className="hist-pill">🔬 {history.total_diagnoses} diagnoses</span>
                  <span className="hist-pill">📊 {history.total_market_queries} queries</span>
                </div>
              </div>
              {history.recent_diagnoses?.slice(0, 3).map((d, i) => (
                <div key={i} className="hist-item">
                  <span>🔬</span>
                  <span>{d.disease_name} — {Math.round(d.confidence * 100)}% confidence</span>
                </div>
              ))}
              {history.recent_market_queries?.slice(0, 3).map((m, i) => (
                <div key={i} className="hist-item">
                  <span>📊</span>
                  <span>{m.crop} → {m.best_market_recommended} · KES {m.net_profit_kes?.toLocaleString()}/kg</span>
                </div>
              ))}
            </>
          )}
        </ResultCard>
      )}

      {loading && <LoadingSpinner label="Orchestrating bilingual report…" />}

      {report && (
        <div style={{ animation: "fadeUp .32s var(--e3) both" }}>
          <ResultCard title="English Advisory" icon="📝" accent="#1d4ed8">
            <p className="report-text">{report.english_report}</p>
          </ResultCard>

          <ResultCard title="Ushauri wa Kiswahili" icon="🇰🇪" accent="#0d9488">
            <p className="report-text swahili-text">{report.swahili_report}</p>
          </ResultCard>

          <ResultCard title="SMS Preview" icon="📱" accent="#7c3aed">
            <div className="sms-bubble">
              <p className="sms-text">{report.sms_text}</p>
            </div>
            <div className="sms-footer">
              <span
                className="sms-count"
                style={{ color: report.sms_text.length > 140 ? "#d97706" : "#9ca3af" }}
              >
                {report.sms_text.length}/160 chars
              </span>
              {report.send_sms && (
                <span className="sms-sent">✓ Sent via Africa's Talking</span>
              )}
            </div>
          </ResultCard>

          <button className="btn btn-outline" style={{ marginTop: 4 }} onClick={() => setReport(null)}>
            ↻ Regenerate Report
          </button>
        </div>
      )}
    </div>
  );
}
