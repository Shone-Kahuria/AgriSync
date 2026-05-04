import { useState } from "react";
import CameraUpload from "../components/CameraUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";
import GpuStatsPanel from "../components/GpuStatsPanel";
import { diagnose, fileToBase64 } from "../api/client";

const SEVERITY_COLOR = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };

export default function DiagnoseScreen({ onResult }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [inferenceMs, setInferenceMs] = useState(null);
  const [error, setError] = useState(null);

  async function handleImage(file) {
    setError(null);
    setResult(null);
    setInferenceMs(null);
    setLoading(true);
    const t0 = performance.now();
    try {
      const b64 = await fileToBase64(file);
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
                    <p style={styles.chemName}>{r.name}</p>
                    <p style={styles.chemDetail}>{r.active_ingredient} · {r.dosage}</p>
                    <p style={styles.chemDetail}>{r.application}</p>
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
  gpuNote: { fontSize: 11, color: "#6b7280", margin: 0 },
  swahili: { fontSize: 14, color: "#1f2937", lineHeight: 1.6, margin: 0, fontStyle: "italic" },
  chemRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
  chemLeft: { flex: 1 },
  chemRight: { textAlign: "right", flexShrink: 0 },
  chemName: { fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" },
  chemDetail: { fontSize: 11, color: "#6b7280", margin: 0 },
  price: { fontSize: 13, fontWeight: 600, color: "#15803d", margin: "0 0 2px" },
  stock: { fontSize: 11, fontWeight: 500 },
};
