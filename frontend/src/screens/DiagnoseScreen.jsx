import { useState } from "react";
import CameraUpload from "../components/CameraUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import GpuStatsPanel from "../components/GpuStatsPanel";
import { diagnose, fileToBase64, reportDiagnosis } from "../api/client";

const SEV = {
  high:   { color: "#dc2626", bg: "#fee2e2", label: "HIGH SEVERITY" },
  medium: { color: "#d97706", bg: "#fef3c7", label: "MEDIUM SEVERITY" },
  low:    { color: "#16a34a", bg: "#dcfce7", label: "LOW SEVERITY" },
};
const PCPB = {
  approved:   { color: "#16a34a", bg: "#dcfce7", label: "✓ PCPB Approved" },
  restricted: { color: "#dc2626", bg: "#fee2e2", label: "⚠ PCPB Restricted" },
  unverified: { color: "#d97706", bg: "#fef3c7", label: "? Unverified" },
};

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
      const hashBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(b64.slice(0, 512))
      );
      const hashHex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16);
      setImageHash(hashHex);
      const data = await diagnose(b64);
      setInferenceMs(performance.now() - t0);
      setResult(data);
      onResult?.(data);
    } catch {
      setError("Analysis failed — please retake photo in better light.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReport() {
    if (!result) return;
    try {
      await reportDiagnosis(
        result.disease_name, null, result.confidence,
        imageHash, null, reportNote || null
      );
    } finally {
      setReportSent(true);
      setShowReportForm(false);
    }
  }

  const sev = result ? (SEV[result.severity] || SEV.low) : null;
  const conf = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div style={s.screen}>
      <div style={s.pageHeader}>
        <h2 style={s.heading}>Crop Disease Diagnosis</h2>
        <p style={s.sub}>Upload a close-up photo of the affected leaf</p>
      </div>

      <CameraUpload onImage={handleImage} disabled={loading} />
      <GpuStatsPanel inferenceMs={inferenceMs} />

      {loading && <LoadingSpinner label="Analyzing crop disease on AMD MI300X…" />}

      {error && (
        <div style={s.errorBox}>
          <span style={s.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div style={s.results}>
          <div style={s.disclaimer}>{result.disclaimer}</div>

          {result.uncertain ? (
            <ResultCard title="Image Too Unclear" icon="⚠️" accent="#d97706">
              <div style={s.unclearHeader}>
                <span style={s.unclearConfBadge}>
                  Confidence: {conf}% — Below threshold
                </span>
              </div>
              <p style={s.unclearText}>
                Retake in natural daylight, close up on the affected leaf.
                Avoid blurry or dark images.
              </p>
              <p style={s.gpuNote}>⚡ {result.gpu_used}</p>
            </ResultCard>
          ) : (
            <>
              <ResultCard
                title="Diagnosis Result"
                icon="🔬"
                accent={sev.color}
              >
                <p style={s.diseaseName}>{result.disease_name}</p>

                {/* Confidence bar */}
                <div style={s.confSection}>
                  <div style={s.confRow}>
                    <span style={s.confLabel}>AI Confidence</span>
                    <span style={{ ...s.confValue, color: sev.color }}>
                      {conf}%
                    </span>
                  </div>
                  <div style={s.confTrack}>
                    <div
                      style={{
                        ...s.confFill,
                        width: `${conf}%`,
                        background: `linear-gradient(90deg, ${sev.color}99, ${sev.color})`,
                      }}
                    />
                  </div>
                </div>

                <div style={s.badgeRow}>
                  <span
                    style={{
                      ...s.sevBadge,
                      background: sev.bg,
                      color: sev.color,
                    }}
                  >
                    {sev.label}
                  </span>
                  {result.requires_expert_review && (
                    <span style={s.expertBadge}>
                      👨‍🌾 Expert review recommended
                    </span>
                  )}
                </div>

                <p style={s.symptoms}>{result.symptoms}</p>
                <p style={s.gpuNote}>⚡ {result.gpu_used}</p>
              </ResultCard>

              <ResultCard title="Kiswahili · Swahili" icon="🇰🇪" accent="#0d9488">
                <p style={s.swahili}>{result.swahili_summary}</p>
              </ResultCard>

              {result.recommendations?.length > 0 && (
                <ResultCard title="Recommended Treatments" icon="💊" accent="#7c3aed">
                  {result.recommendations.map((r, idx) => {
                    const pcpb = PCPB[r.pcpb_status] || {
                      color: "#6b7280",
                      bg: "#f3f4f6",
                      label: r.pcpb_status,
                    };
                    const isLast = idx === result.recommendations.length - 1;
                    return (
                      <div
                        key={r.name}
                        style={{
                          ...s.treatCard,
                          borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                          marginBottom: isLast ? 0 : 14,
                          paddingBottom: isLast ? 0 : 14,
                        }}
                      >
                        <div style={s.treatHeader}>
                          <div style={s.treatNameGroup}>
                            <p style={s.treatName}>{r.name}</p>
                            <span
                              style={{
                                ...s.pcpbBadge,
                                background: pcpb.bg,
                                color: pcpb.color,
                              }}
                            >
                              {pcpb.label}
                            </span>
                          </div>
                          <div style={s.treatPricing}>
                            <p style={s.treatPrice}>KES {r.price_kes}</p>
                            <span
                              style={{
                                ...s.stockLabel,
                                color: r.in_stock ? "#16a34a" : "#dc2626",
                              }}
                            >
                              {r.in_stock ? "● In stock" : "○ Out of stock"}
                            </span>
                          </div>
                        </div>
                        <p style={s.treatDetail}>
                          {r.active_ingredient} · {r.dosage}
                        </p>
                        <p style={s.treatDetail}>{r.application}</p>
                        {r.safety_note && (
                          <div
                            style={{
                              ...s.safetyNote,
                              borderColor: pcpb.color + "50",
                              background: pcpb.bg,
                              color: pcpb.color === "#dc2626" ? "#991b1b" : "#78350f",
                            }}
                          >
                            {r.safety_note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ResultCard>
              )}
            </>
          )}

          {/* Feedback */}
          {!reportSent && !showReportForm && (
            <button style={s.flagBtn} onClick={() => setShowReportForm(true)}>
              🚩 Flag Wrong Diagnosis
            </button>
          )}
          {showReportForm && (
            <ResultCard title="Flag Wrong Diagnosis" accent="#6b7280">
              <p style={s.reportHint}>
                Your feedback helps improve AgriSync for all farmers.
              </p>
              <textarea
                style={s.reportInput}
                placeholder="What disease do you think it is? (optional)"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
              />
              <div style={s.reportActions}>
                <button style={s.reportSubmit} onClick={handleReport}>
                  Send Report
                </button>
                <button
                  style={s.reportCancel}
                  onClick={() => setShowReportForm(false)}
                >
                  Cancel
                </button>
              </div>
            </ResultCard>
          )}
          {reportSent && (
            <div style={s.reportConfirm}>
              ✓ Thank you — your report has been recorded.
            </div>
          )}
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

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#dc2626",
    background: "#fef2f2",
    borderRadius: 10,
    padding: "12px 16px",
    margin: "12px 0",
    border: "1px solid #fecaca",
  },
  errorIcon: { fontSize: 16, flexShrink: 0 },

  results: { animation: "fadeUp 0.35s ease forwards" },

  disclaimer: {
    fontSize: 11,
    color: "#6b7280",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "9px 12px",
    marginBottom: 12,
    lineHeight: 1.55,
  },

  /* Diagnosis card */
  diseaseName: {
    fontSize: 21,
    fontWeight: 800,
    color: "#111827",
    margin: "0 0 14px",
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
  },

  confSection: { marginBottom: 12 },
  confRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  confLabel: { fontSize: 11, color: "#6b7280", fontWeight: 500 },
  confValue: { fontSize: 15, fontWeight: 800 },
  confTrack: {
    height: 7,
    background: "#f3f4f6",
    borderRadius: 4,
    overflow: "hidden",
  },
  confFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 1s cubic-bezier(.22,.68,0,1.2)",
  },

  badgeRow: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  sevBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "5px 12px",
    borderRadius: 20,
    letterSpacing: "0.04em",
  },
  expertBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 12px",
    borderRadius: 20,
    background: "#fef3c7",
    color: "#92400e",
  },

  symptoms: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.65,
    margin: "0 0 10px",
  },
  gpuNote: { fontSize: 11, color: "#9ca3af", margin: 0 },

  swahili: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 1.75,
    margin: 0,
    fontStyle: "italic",
  },

  /* Treatment cards */
  treatCard: {},
  treatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  treatNameGroup: { flex: 1 },
  treatName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 4px",
  },
  pcpbBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
  },
  treatPricing: { textAlign: "right", flexShrink: 0, paddingLeft: 10 },
  treatPrice: { fontSize: 15, fontWeight: 800, color: "#15803d", margin: "0 0 3px" },
  stockLabel: { fontSize: 11, fontWeight: 600 },
  treatDetail: { fontSize: 12, color: "#6b7280", margin: "2px 0", lineHeight: 1.4 },
  safetyNote: {
    fontSize: 11,
    fontWeight: 500,
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 7,
    borderLeft: "3px solid",
    lineHeight: 1.45,
  },

  /* Unclear */
  unclearHeader: { marginBottom: 10 },
  unclearConfBadge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    background: "#fef3c7",
    color: "#92400e",
    padding: "5px 12px",
    borderRadius: 20,
  },
  unclearText: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 1.65,
    margin: "0 0 8px",
  },

  /* Feedback */
  flagBtn: {
    width: "100%",
    padding: "12px 0",
    marginTop: 4,
    borderRadius: 10,
    background: "none",
    border: "1px solid #e5e7eb",
    fontSize: 13,
    color: "#6b7280",
    cursor: "pointer",
    fontWeight: 500,
    transition: "border-color 0.15s",
  },
  reportHint: { fontSize: 12, color: "#6b7280", margin: "0 0 10px" },
  reportInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 13,
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    lineHeight: 1.55,
    background: "#f9fafb",
  },
  reportActions: { display: "flex", gap: 8, marginTop: 10 },
  reportSubmit: {
    flex: 1,
    padding: "11px 0",
    borderRadius: 10,
    background: "#374151",
    color: "#fff",
    border: "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  reportCancel: {
    padding: "11px 18px",
    borderRadius: 10,
    background: "none",
    border: "1px solid #d1d5db",
    fontSize: 13,
    color: "#9ca3af",
    cursor: "pointer",
  },
  reportConfirm: {
    fontSize: 13,
    color: "#16a34a",
    textAlign: "center",
    margin: "8px 0",
    fontWeight: 600,
    padding: "12px 16px",
    background: "#f0fdf4",
    borderRadius: 10,
    border: "1px solid #bbf7d0",
  },
};
