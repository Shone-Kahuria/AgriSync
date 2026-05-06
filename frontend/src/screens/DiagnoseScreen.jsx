import { useState } from "react";
import CameraUpload from "../components/CameraUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import GpuStatsPanel from "../components/GpuStatsPanel";
import { diagnose, fileToBase64, reportDiagnosis } from "../api/client";

const SEVERITY_COLOR = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };
const PCPB_COLOR = { approved: "#16a34a", restricted: "#dc2626", unverified: "#d97706" };
const PCPB_LABEL = { approved: "PCPB Approved", restricted: "PCPB Restricted", unverified: "Unverified" };

export default function DiagnoseScreen({ onResult }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imageHash, setImageHash] = useState(null);
  const [inferenceMs, setInferenceMs] = useState(null);
  const [error, setError] = useState(null);
  const [reportSent, setReportSent] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);

  async function handleImage(file) {
    setError(null);
    setResult(null);
    setInferenceMs(null);
    setReportSent(false);
    setShowReportForm(false);
    setLoading(true);
    const t0 = performance.now();
    try {
      const b64 = await fileToBase64(file);
      // compute a short hash for dedup in feedback
      const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(b64.slice(0, 512)));
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("").slice(0,16);
      setImageHash(hashHex);
      const data = await diagnose(b64);
      setInferenceMs(performance.now() - t0);
      setResult(data);
      onResult?.(data);
    } catch (e) {
      setError("Analysis failed — please retake photo in better light.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReport() {
    if (!result) return;
    try {
      await reportDiagnosis(result.disease_name, null, result.confidence, imageHash, null, reportNote || null);
      setReportSent(true);
      setShowReportForm(false);
    } catch (e) {
      setReportSent(true); // optimistic — don't block user on feedback failure
    }
  }

  return (
    <div style={styles.screen}>
      <h2 style={styles.heading}>Crop Disease Diagnosis</h2>
      <p style={styles.sub}>Upload a close-up photo of the affected leaf</p>

      <CameraUpload onImage={handleImage} disabled={loading} />

      <GpuStatsPanel inferenceMs={inferenceMs} />

      {loading && <LoadingSpinner label="Analyzing on AMD MI300X…" />}

      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <>
          {/* Disclaimer — always shown */}
          <div style={styles.disclaimer}>{result.disclaimer}</div>

          {result.uncertain ? (
            <ResultCard title="Image Too Unclear" accent="#d97706">
              <div style={styles.uncertainBanner}>
                <p style={styles.uncertainTitle}>Could not confidently diagnose</p>
                <p style={styles.uncertainConf}>Confidence: {Math.round(result.confidence * 100)}%</p>
                <p style={styles.uncertainHint}>
                  Retake the photo in natural daylight, close up on the affected leaf.
                  Avoid blurry or dark images.
                </p>
                <p style={styles.gpuNote}>⚡ {result.gpu_used}</p>
              </div>
            </ResultCard>
          ) : (
            <>
              <ResultCard
                title="Diagnosis"
                accent={SEVERITY_COLOR[result.severity] || "#15803d"}
              >
                <p style={styles.diseaseName}>{result.disease_name}</p>
                <div style={styles.row}>
                  <span style={{ ...styles.badge, background: SEVERITY_COLOR[result.severity] + "20", color: SEVERITY_COLOR[result.severity] }}>
                    {result.severity.toUpperCase()} severity
                  </span>
                  <span style={styles.conf}>{Math.round(result.confidence * 100)}% confidence</span>
                </div>
                {result.requires_expert_review && (
                  <div style={styles.expertWarning}>
                    Confirm with a licensed agronomist before treating.
                  </div>
                )}
                <p style={styles.symptoms}>{result.symptoms}</p>
                <p style={styles.gpuNote}>⚡ {result.gpu_used}</p>
              </ResultCard>

              <ResultCard title="Swahili / Kiswahili" accent="#0d9488">
                <p style={styles.swahili}>{result.swahili_summary}</p>
              </ResultCard>

              {result.recommendations?.length > 0 && (
                <ResultCard title="Recommended Treatments">
                  {result.recommendations.map((r) => (
                    <div key={r.name} style={styles.chemRow}>
                      <div style={styles.chemLeft}>
                        <div style={styles.chemHeader}>
                          <p style={styles.chemName}>{r.name}</p>
                          <span style={{
                            ...styles.pcpbBadge,
                            background: (PCPB_COLOR[r.pcpb_status] || "#9ca3af") + "18",
                            color: PCPB_COLOR[r.pcpb_status] || "#6b7280",
                          }}>
                            {PCPB_LABEL[r.pcpb_status] || r.pcpb_status}
                          </span>
                        </div>
                        <p style={styles.chemDetail}>{r.active_ingredient} · {r.dosage}</p>
                        <p style={styles.chemDetail}>{r.application}</p>
                        {r.safety_note && (
                          <p style={{
                            ...styles.safetyNote,
                            color: r.pcpb_status === "restricted" ? "#dc2626" : "#92400e",
                          }}>
                            {r.safety_note}
                          </p>
                        )}
                      </div>
                      <div style={styles.chemRight}>
                        <p style={styles.price}>KES {r.price_kes}</p>
                        <span style={{ ...styles.stock, color: r.in_stock ? "#16a34a" : "#dc2626" }}>
                          {r.in_stock ? "In stock" : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  ))}
                </ResultCard>
              )}
            </>
          )}

          {/* Feedback */}
          {!reportSent && !showReportForm && (
            <button style={styles.reportBtn} onClick={() => setShowReportForm(true)}>
              Report Wrong Diagnosis
            </button>
          )}
          {showReportForm && (
            <ResultCard title="Report Wrong Diagnosis" accent="#6b7280">
              <p style={styles.reportHint}>Your feedback helps improve AgriSync for all farmers.</p>
              <textarea
                style={styles.reportInput}
                placeholder="Optional: what disease do you think it is?"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
              />
              <div style={styles.reportActions}>
                <button style={styles.reportSubmit} onClick={handleReport}>Send Report</button>
                <button style={styles.reportCancel} onClick={() => setShowReportForm(false)}>Cancel</button>
              </div>
            </ResultCard>
          )}
          {reportSent && (
            <p style={styles.reportConfirm}>Thank you — your report has been recorded.</p>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  screen: { padding: "0 0 32px" },
  heading: { fontSize: 20, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  sub: { fontSize: 13, color: "#6b7280", margin: "0 0 18px" },
  error: { fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "10px 14px", margin: "12px 0" },
  diseaseName: { fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 8px" },
  row: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  badge: { fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20 },
  conf: { fontSize: 12, color: "#6b7280" },
  symptoms: { fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 },
  gpuNote: { fontSize: 11, color: "#6b7280", margin: "8px 0 0" },
  disclaimer: {
    fontSize: 11, color: "#6b7280", background: "#f9fafb",
    border: "1px solid #e5e7eb", borderRadius: 8,
    padding: "8px 12px", margin: "0 0 12px", lineHeight: 1.4,
  },
  expertWarning: {
    fontSize: 12, fontWeight: 600, color: "#92400e",
    background: "#fef3c7", border: "1px solid #fde68a",
    borderRadius: 6, padding: "6px 10px", margin: "6px 0 8px",
  },
  chemHeader: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 },
  pcpbBadge: { fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, flexShrink: 0 },
  safetyNote: { fontSize: 11, fontWeight: 500, margin: "4px 0 0", lineHeight: 1.4 },
  reportBtn: {
    width: "100%", padding: "10px 0", marginTop: 12,
    borderRadius: 8, background: "none", border: "1px solid #d1d5db",
    fontSize: 13, color: "#6b7280", cursor: "pointer",
  },
  reportHint: { fontSize: 12, color: "#6b7280", margin: "0 0 8px" },
  reportInput: {
    width: "100%", padding: "8px 10px", borderRadius: 6,
    border: "1px solid #d1d5db", fontSize: 13, resize: "vertical",
    fontFamily: "inherit", boxSizing: "border-box",
  },
  reportActions: { display: "flex", gap: 8, marginTop: 8 },
  reportSubmit: {
    flex: 1, padding: "9px 0", borderRadius: 7,
    background: "#374151", color: "#fff", border: "none",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  reportCancel: {
    padding: "9px 16px", borderRadius: 7,
    background: "none", border: "1px solid #d1d5db",
    fontSize: 13, color: "#9ca3af", cursor: "pointer",
  },
  reportConfirm: { fontSize: 12, color: "#16a34a", textAlign: "center", margin: "8px 0 0" },
  uncertainBanner: { padding: "2px 0" },
  uncertainTitle: { fontSize: 16, fontWeight: 600, color: "#92400e", margin: "0 0 4px" },
  uncertainConf: { fontSize: 13, color: "#b45309", fontWeight: 500, margin: "0 0 8px" },
  uncertainHint: { fontSize: 13, color: "#78350f", lineHeight: 1.5, margin: "0 0 4px" },
  swahili: { fontSize: 14, color: "#1f2937", lineHeight: 1.6, margin: 0, fontStyle: "italic" },
  chemRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
  chemLeft: { flex: 1 },
  chemRight: { textAlign: "right", flexShrink: 0 },
  chemName: { fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" },
  chemDetail: { fontSize: 11, color: "#6b7280", margin: 0 },
  price: { fontSize: 13, fontWeight: 600, color: "#15803d", margin: "0 0 2px" },
  stock: { fontSize: 11, fontWeight: 500 },
};
