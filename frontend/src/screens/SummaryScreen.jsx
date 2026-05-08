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
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);
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
    setError(null);
    setLoading(true);
    try {
      const data = await getReport(
        diagnoseResult, arbitrageResult, farmerName, phone || null
      );
      setReport(data);
      if (phone) {
        registerFarmer(phone, farmerName || null, null, null).catch(() => {});
      }
    } catch {
      setError("Could not generate report — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewHistory() {
    if (!phone) return;
    setHistoryLoading(true);
    setHistory(null);
    try {
      const data = await getFarmerHistory(phone);
      setHistory(data);
    } catch {
      setHistory({ error: "No history found for this number." });
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.pageHeader}>
        <h2 style={s.heading}>Summary Report</h2>
        <p style={s.sub}>Bilingual advisory combining diagnosis &amp; market data</p>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div style={s.empty}>
          <div style={s.emptyIconWrap}>
            <span style={s.emptyEmoji}>📋</span>
          </div>
          <p style={s.emptyTitle}>No data yet</p>
          <p style={s.emptyText}>
            Complete the <strong>Diagnose</strong> and/or <strong>Market</strong> steps
            first to generate a combined report.
          </p>
        </div>
      )}

      {/* Input form */}
      {hasData && !report && (
        <div>
          {/* Data chips */}
          <div style={s.chipRow}>
            {diagnoseResult && (
              <div style={{ ...s.chip, background: "#fef3c7", borderColor: "#fde68a", color: "#92400e" }}>
                <span>🔬</span>
                <span>{diagnoseResult.disease_name}</span>
              </div>
            )}
            {arbitrageResult && (
              <div style={{ ...s.chip, background: "#dcfce7", borderColor: "#bbf7d0", color: "#166534" }}>
                <span>📊</span>
                <span>Best: {arbitrageResult.best_market}</span>
              </div>
            )}
          </div>

          <div style={s.formCard}>
            <p style={s.formSectionTitle}>Farmer Details</p>
            <p style={s.formSectionSub}>Optional — used to personalise your report</p>

            <div style={s.field}>
              <label style={s.label}>Full name</label>
              <input
                style={s.input}
                placeholder="e.g. Wanjiku Kamau"
                value={farmerName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Phone number (for SMS)</label>
              <input
                style={s.input}
                placeholder="+254 7XX XXX XXX"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              <span style={s.hint}>📱 Swahili SMS via Africa's Talking API</span>
            </div>

            {error && (
              <div style={s.errorBox}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button style={s.genBtn} onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "Generate Report →"}
            </button>

            {phone && (
              <button
                style={s.historyBtn}
                onClick={handleViewHistory}
                disabled={historyLoading}
              >
                {historyLoading ? "Loading…" : "📜 View My History"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* History panel */}
      {history && (
        <ResultCard title="Farming History" icon="📜" accent="#7c3aed">
          {history.error ? (
            <p style={s.historyEmpty}>{history.error}</p>
          ) : (
            <>
              <div style={s.historyHeader}>
                <span style={s.historyName}>
                  {history.farmer?.name || "Farmer"}
                </span>
                <div style={s.historyMeta}>
                  <span style={s.historyPill}>
                    🔬 {history.total_diagnoses} diagnoses
                  </span>
                  <span style={s.historyPill}>
                    📊 {history.total_market_queries} queries
                  </span>
                </div>
              </div>
              {history.recent_diagnoses?.slice(0, 3).map((d, i) => (
                <div key={i} style={s.historyItem}>
                  <span style={s.historyItemIcon}>🔬</span>
                  <span>
                    {d.disease_name} — {Math.round(d.confidence * 100)}% confidence
                  </span>
                </div>
              ))}
              {history.recent_market_queries?.slice(0, 3).map((m, i) => (
                <div key={i} style={s.historyItem}>
                  <span style={s.historyItemIcon}>📊</span>
                  <span>
                    {m.crop} → {m.best_market_recommended} · KES{" "}
                    {m.net_profit_kes?.toLocaleString()}/kg
                  </span>
                </div>
              ))}
            </>
          )}
        </ResultCard>
      )}

      {loading && <LoadingSpinner label="Orchestrating bilingual report…" />}

      {/* Report output */}
      {report && (
        <div style={s.reportSection}>
          <ResultCard title="English Advisory" icon="📝" accent="#1d4ed8">
            <p style={s.reportText}>{report.english_report}</p>
          </ResultCard>

          <ResultCard title="Ushauri wa Kiswahili" icon="🇰🇪" accent="#0d9488">
            <p style={s.reportText}>{report.swahili_report}</p>
          </ResultCard>

          <ResultCard title="SMS Preview" icon="📱" accent="#7c3aed">
            <div style={s.smsBubble}>
              <p style={s.smsText}>{report.sms_text}</p>
            </div>
            <div style={s.smsFooter}>
              <span
                style={{
                  ...s.smsCount,
                  color: report.sms_text.length > 140 ? "#d97706" : "#9ca3af",
                }}
              >
                {report.sms_text.length}/160 chars
              </span>
              {report.send_sms && (
                <span style={s.smsSent}>✓ Sent via Africa's Talking</span>
              )}
            </div>
          </ResultCard>

          <button style={s.resetBtn} onClick={() => setReport(null)}>
            ↻ Regenerate Report
          </button>
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

  /* Empty state */
  empty: {
    textAlign: "center",
    padding: "52px 24px 44px",
    background: "#fff",
    borderRadius: 18,
    border: "1px dashed #d1d5db",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: "#111827",
    margin: "0 0 8px",
    letterSpacing: "-0.01em",
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.65,
  },

  /* Data chips */
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid",
  },

  /* Form */
  formCard: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: "18px 16px",
    marginBottom: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 3px 10px rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  formSectionSub: {
    fontSize: 12,
    color: "#9ca3af",
    margin: "-10px 0 0",
  },
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
  },
  hint: { fontSize: 11, color: "#9ca3af" },

  genBtn: {
    padding: "14px 0",
    borderRadius: 12,
    background: "linear-gradient(135deg,#1d4ed8,#2563eb)",
    color: "#fff",
    border: "none",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(29,78,216,0.3)",
    letterSpacing: "0.01em",
  },
  historyBtn: {
    padding: "12px 0",
    borderRadius: 10,
    background: "none",
    border: "1px solid #7c3aed",
    fontSize: 13,
    fontWeight: 700,
    color: "#7c3aed",
    cursor: "pointer",
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

  /* History */
  historyHeader: { marginBottom: 12 },
  historyName: {
    display: "block",
    fontSize: 15,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 6,
    letterSpacing: "-0.01em",
  },
  historyMeta: { display: "flex", gap: 6, flexWrap: "wrap" },
  historyPill: {
    fontSize: 11,
    fontWeight: 600,
    background: "#f3f4f6",
    color: "#374151",
    padding: "3px 10px",
    borderRadius: 20,
  },
  historyItem: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    fontSize: 13,
    color: "#374151",
    margin: "5px 0",
    lineHeight: 1.45,
  },
  historyItemIcon: { fontSize: 12, flexShrink: 0 },
  historyEmpty: { fontSize: 13, color: "#9ca3af", margin: 0 },

  /* Report */
  reportSection: { animation: "fadeUp 0.35s ease forwards" },
  reportText: { fontSize: 14, color: "#1f2937", lineHeight: 1.75, margin: 0 },

  smsBubble: {
    background: "#f5f3ff",
    borderRadius: "14px 14px 4px 14px",
    padding: "13px 15px",
    marginBottom: 9,
  },
  smsText: { fontSize: 13, color: "#4c1d95", margin: 0, lineHeight: 1.6 },
  smsFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smsCount: { fontSize: 11, fontWeight: 600 },
  smsSent: { fontSize: 12, color: "#16a34a", fontWeight: 600 },

  resetBtn: {
    width: "100%",
    padding: "13px 0",
    borderRadius: 10,
    background: "none",
    border: "1px solid #d1d5db",
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
    fontWeight: 500,
    marginTop: 4,
  },
};
