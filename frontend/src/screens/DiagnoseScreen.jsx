import { useState } from "react";
import CameraUpload from "../components/CameraUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import GpuStatsPanel from "../components/GpuStatsPanel";
import { diagnose, fileToBase64, reportDiagnosis } from "../api/client";
import { toast } from "../components/Toast";

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
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [imageHash, setImageHash]       = useState(null);
  const [inferenceMs, setInferenceMs]   = useState(null);
  const [error, setError]               = useState(null);
  const [reportSent, setReportSent]     = useState(false);
  const [reportNote, setReportNote]     = useState("");
  const [showReportForm, setShowReport] = useState(false);

  async function handleImage(file) {
    setError(null); setResult(null); setInferenceMs(null);
    setReportSent(false); setShowReport(false); setLoading(true);
    const t0 = performance.now();
    try {
      const b64 = await fileToBase64(file);
      const hashBuf = await crypto.subtle.digest(
        "SHA-256", new TextEncoder().encode(b64.slice(0, 512))
      );
      setImageHash(
        Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("").slice(0, 16)
      );
      const data = await diagnose(b64);
      setInferenceMs(performance.now() - t0);
      setResult(data);
      onResult?.(data);
      if (!data.uncertain) {
        toast.success("Diagnosis complete!", `${data.disease_name} detected.`);
      } else {
        toast.warning("Image unclear", "Retake in natural daylight for best results.");
      }
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
      setReportSent(true); setShowReport(false);
    }
  }

  const sev  = result ? (SEV[result.severity] || SEV.low) : null;
  const conf = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="page-header">
        <h2 className="page-title">Crop Disease Diagnosis</h2>
        <p className="page-sub">Upload a close-up photo of the affected leaf</p>
      </div>

      <CameraUpload onImage={handleImage} disabled={loading} />
      <GpuStatsPanel inferenceMs={inferenceMs} />

      {loading && <LoadingSpinner label="Analyzing crop disease on AMD MI300X…" />}

      {error && (
        <div className="error-box">
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div style={{ animation: "fadeUp .32s var(--e3) both" }}>
          <div className="disclaimer-box">{result.disclaimer}</div>

          {result.uncertain ? (
            <ResultCard title="Image Too Unclear" icon="⚠️" accent="#d97706">
              <div className="badge-row">
                <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                  Confidence: {conf}% — Below threshold
                </span>
              </div>
              <p className="symptoms-text">
                Retake in natural daylight, close up on the affected leaf.
                Avoid blurry or dark images.
              </p>
              <p className="gpu-note">⚡ {result.gpu_used}</p>
            </ResultCard>
          ) : (
            <>
              <ResultCard title="Diagnosis Result" icon="🔬" accent={sev.color}>
                <p className="disease-name">{result.disease_name}</p>

                <div className="conf-header">
                  <span className="conf-lbl">AI Confidence</span>
                  <span className="conf-pct" style={{ color: sev.color }}>{conf}%</span>
                </div>
                <div className="conf-track">
                  <div
                    className="conf-fill"
                    style={{
                      width: `${conf}%`,
                      background: `linear-gradient(90deg,${sev.color}99,${sev.color})`,
                    }}
                  />
                </div>

                <div className="badge-row">
                  <span className="badge" style={{ background: sev.bg, color: sev.color }}>
                    {sev.label}
                  </span>
                  {result.requires_expert_review && (
                    <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                      👨‍🌾 Expert review recommended
                    </span>
                  )}
                </div>

                <p className="symptoms-text">{result.symptoms}</p>
                <p className="gpu-note">⚡ {result.gpu_used}</p>
              </ResultCard>

              <ResultCard title="Swahili · Local Advisory" icon="🌍" accent="#0d9488">
                <p className="swahili-text">{result.swahili_summary}</p>
              </ResultCard>

              {result.recommendations?.length > 0 && (
                <ResultCard title="Recommended Treatments" icon="💊" accent="#7c3aed">
                  {result.recommendations.map((r, idx) => {
                    const pcpb = PCPB[r.pcpb_status] || {
                      color: "#6b7280", bg: "#f3f4f6", label: r.pcpb_status,
                    };
                    const isLast = idx === result.recommendations.length - 1;
                    return (
                      <div
                        key={r.name}
                        className="treat-item"
                        style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}
                      >
                        <div className="treat-header">
                          <div>
                            <p className="treat-name">{r.name}</p>
                            <span className="badge" style={{ background: pcpb.bg, color: pcpb.color }}>
                              {pcpb.label}
                            </span>
                          </div>
                          <div style={{ textAlign: "right", paddingLeft: 10, flexShrink: 0 }}>
                            <p className="treat-price">KES {r.price_kes}</p>
                            <span className="treat-stock" style={{ color: r.in_stock ? "#16a34a" : "#dc2626" }}>
                              {r.in_stock ? "● In stock" : "○ Out of stock"}
                            </span>
                          </div>
                        </div>
                        <p className="treat-detail">{r.active_ingredient} · {r.dosage}</p>
                        <p className="treat-detail">{r.application}</p>
                        {r.safety_note && (
                          <div
                            className="treat-safety"
                            style={{
                              borderColor: pcpb.color + "55",
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

          {!reportSent && !showReportForm && (
            <button className="flag-btn" onClick={() => setShowReport(true)}>
              🚩 Flag Wrong Diagnosis
            </button>
          )}

          {showReportForm && (
            <ResultCard title="Flag Wrong Diagnosis" accent="#6b7280">
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                Your feedback helps improve AgriSync for all farmers.
              </p>
              <textarea
                className="report-input"
                placeholder="What disease do you think it is? (optional)"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, background: "#334155", color: "#fff", border: "none" }}
                  onClick={handleReport}
                >
                  Send Report
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: "none", padding: "11px 18px" }}
                  onClick={() => setShowReport(false)}
                >
                  Cancel
                </button>
              </div>
            </ResultCard>
          )}

          {reportSent && (
            <div className="report-confirm">
              ✓ Thank you — your report has been recorded.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
