import { useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import { getReport } from "../api/client";

export default function SummaryScreen({ diagnoseResult, arbitrageResult }) {
  const [farmerName, setFarmerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const hasData = diagnoseResult || arbitrageResult;

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const data = await getReport(diagnoseResult, arbitrageResult, farmerName, phone || null);
      setReport(data);
    } catch (e) {
      setError("Could not generate report — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.screen}>
      <h2 style={styles.heading}>Summary Report</h2>
      <p style={styles.sub}>Bilingual advisory combining diagnosis and market data</p>

      {!hasData && (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>📋</p>
          <p style={styles.emptyText}>Complete the diagnosis and/or market steps first to generate a combined report.</p>
        </div>
      )}

      {hasData && !report && (
        <div style={styles.form}>
          <div style={styles.dataChips}>
            {diagnoseResult && (
              <div style={{ ...styles.chip, background: "#fef3c7", color: "#92400e" }}>
                ✓ Disease: {diagnoseResult.disease_name}
              </div>
            )}
            {arbitrageResult && (
              <div style={{ ...styles.chip, background: "#dcfce7", color: "#166534" }}>
                ✓ Best market: {arbitrageResult.best_market}
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Farmer name (optional)</label>
            <input
              style={styles.input} placeholder="e.g. Wanjiku Kamau"
              value={farmerName} onChange={(e) => setFarmerName(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone for SMS (optional)</label>
            <input
              style={styles.input} placeholder="+254 7XX XXX XXX" type="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)}
            />
            <span style={styles.hint}>Sends via Africa's Talking API (Swahili SMS)</span>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.genBtn} onClick={handleGenerate} disabled={loading}>
            Generate Report
          </button>
        </div>
      )}

      {loading && <LoadingSpinner label="Orchestrating bilingual report with Mistral-7B…" />}

      {report && (
        <>
          <ResultCard title="English Advisory" accent="#1d4ed8">
            <p style={styles.reportText}>{report.english_report}</p>
          </ResultCard>

          <ResultCard title="Ushauri wa Kiswahili" accent="#0d9488">
            <p style={styles.reportText}>{report.swahili_report}</p>
          </ResultCard>

          <ResultCard title="SMS Preview (≤160 chars)" accent="#7c3aed">
            <div style={styles.smsBox}>
              <p style={styles.smsText}>{report.sms_text}</p>
              <p style={styles.smsLen}>{report.sms_text.length}/160</p>
            </div>
            {report.send_sms && (
              <p style={styles.smsSent}>✓ SMS sent via Africa's Talking API</p>
            )}
          </ResultCard>

          <button style={styles.resetBtn} onClick={() => setReport(null)}>
            Regenerate
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  screen: { padding: "0 0 32px" },
  heading: { fontSize: 20, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  sub: { fontSize: 13, color: "#6b7280", margin: "0 0 18px" },
  empty: {
    textAlign: "center", padding: "40px 16px",
    background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db",
  },
  emptyIcon: { fontSize: 36, margin: "0 0 8px" },
  emptyText: { fontSize: 13, color: "#6b7280", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 },
  dataChips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 500, color: "#374151" },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, outline: "none" },
  hint: { fontSize: 11, color: "#9ca3af" },
  genBtn: {
    padding: "12px 0", borderRadius: 10,
    background: "#1d4ed8", color: "#fff", border: "none",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  error: { fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "10px 14px" },
  reportText: { fontSize: 14, color: "#1f2937", lineHeight: 1.6, margin: 0 },
  smsBox: { background: "#f5f3ff", borderRadius: 8, padding: "10px 12px", marginBottom: 6 },
  smsText: { fontSize: 13, color: "#4c1d95", margin: "0 0 4px", lineHeight: 1.5 },
  smsLen: { fontSize: 11, color: "#7c3aed", margin: 0, textAlign: "right" },
  smsSent: { fontSize: 12, color: "#16a34a", margin: 0 },
  resetBtn: {
    padding: "10px 20px", borderRadius: 8, background: "none",
    border: "1px solid #d1d5db", fontSize: 13, color: "#6b7280", cursor: "pointer",
  },
};
