import { useRef, useState } from "react";

export default function CameraUpload({ onImage, disabled }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImage(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImage(file);
  }

  function handleRetake() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={s.wrap}>
      {preview ? (
        <div style={s.previewContainer}>
          <img src={preview} alt="Crop leaf" style={s.previewImg} />
          <div style={s.previewOverlay}>
            <div style={s.previewBadge}>
              <span style={s.previewBadgeDot} />
              Photo loaded
            </div>
            {!disabled && (
              <button style={s.retakeBtn} onClick={handleRetake}>
                📷 Retake
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          style={{
            ...s.uploadZone,
            ...(dragging ? s.uploadZoneDrag : {}),
            ...(disabled ? s.uploadZoneDisabled : {}),
          }}
          onClick={() => !disabled && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
        >
          <div style={s.iconCircle}>
            <span style={s.iconEmoji}>📷</span>
          </div>
          <span style={s.uploadTitle}>Upload Leaf Photo</span>
          <span style={s.uploadSub}>Tap to take a photo or choose from gallery</span>
          <div style={s.uploadHintPill}>JPG · PNG · Close-up of affected leaf</div>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}

const s = {
  wrap: { marginBottom: 16 },

  /* Upload zone */
  uploadZone: {
    width: "100%",
    padding: "36px 20px 28px",
    border: "2px dashed #86efac",
    borderRadius: 18,
    background: "linear-gradient(160deg,#f0fdf4 0%,#f7fef9 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 9,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 10px rgba(22,163,74,0.07)",
  },
  uploadZoneDrag: {
    borderColor: "#16a34a",
    background: "linear-gradient(160deg,#dcfce7 0%,#f0fdf4 100%)",
    boxShadow: "0 4px 20px rgba(22,163,74,0.18)",
    transform: "scale(1.01)",
  },
  uploadZoneDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#16a34a,#0d9488)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(22,163,74,0.35)",
    marginBottom: 4,
  },
  iconEmoji: { fontSize: 32 },

  uploadTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#15803d",
    letterSpacing: "-0.01em",
  },
  uploadSub: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
    lineHeight: 1.4,
  },
  uploadHintPill: {
    fontSize: 11,
    color: "#6b7280",
    background: "rgba(22,163,74,0.08)",
    padding: "4px 12px",
    borderRadius: 20,
    marginTop: 2,
  },

  /* Preview */
  previewContainer: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
  },
  previewImg: {
    width: "100%",
    maxHeight: 270,
    objectFit: "cover",
    display: "block",
  },
  previewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "28px 14px 12px",
    background: "linear-gradient(transparent,rgba(0,0,0,0.55))",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
  },
  previewBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 5px #4ade80",
  },
  retakeBtn: {
    padding: "7px 14px",
    background: "rgba(255,255,255,0.9)",
    border: "none",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    color: "#15803d",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
};
