import { useRef, useState } from "react";

export default function CameraUpload({ onImage, disabled }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImage(file);
  }

  return (
    <div style={styles.wrap}>
      {preview ? (
        <img src={preview} alt="Crop leaf" style={styles.preview} />
      ) : (
        <button
          style={styles.uploadBtn}
          onClick={() => fileRef.current.click()}
          disabled={disabled}
        >
          <span style={styles.icon}>📷</span>
          <span style={styles.btnText}>Take photo or upload</span>
          <span style={styles.hint}>JPG / PNG — leaf close-up</span>
        </button>
      )}

      {preview && !disabled && (
        <button style={styles.retake} onClick={() => { setPreview(null); fileRef.current.value = ""; }}>
          Retake photo
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

const styles = {
  wrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  uploadBtn: {
    width: "100%", padding: "24px 16px",
    border: "2px dashed #d1fae5",
    borderRadius: 14, background: "#f0fdf4",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    cursor: "pointer", transition: "border-color .2s",
  },
  icon: { fontSize: 36 },
  btnText: { fontSize: 15, fontWeight: 600, color: "#15803d" },
  hint: { fontSize: 12, color: "#6b7280" },
  preview: {
    width: "100%", maxHeight: 260,
    objectFit: "cover", borderRadius: 12,
    border: "1px solid #d1fae5",
  },
  retake: {
    fontSize: 13, color: "#6b7280", background: "none",
    border: "1px solid #e5e7eb", borderRadius: 8,
    padding: "6px 16px", cursor: "pointer",
  },
};
