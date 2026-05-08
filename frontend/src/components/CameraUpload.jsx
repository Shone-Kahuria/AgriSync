import { useRef, useState } from "react";

export default function CameraUpload({ onImage, disabled }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onImage(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    onImage(file);
  }

  function handleRetake() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {preview ? (
        <div className="upload-preview">
          <img src={preview} alt="Crop leaf" />
          <div className="upload-preview-overlay">
            <span className="upload-preview-label">
              <span className="upload-preview-dot" />
              Photo loaded
            </span>
            {!disabled && (
              <button className="retake-btn" onClick={handleRetake}>
                📷 Retake
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          className={`upload-zone${dragging ? " dragging" : ""}`}
          onClick={() => !disabled && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
        >
          <div className="upload-icon-circle">📷</div>
          <span className="upload-title">Upload Leaf Photo</span>
          <span className="upload-sub">Tap to take a photo or choose from gallery</span>
          <span className="upload-hint">JPG · PNG · Close-up of affected leaf</span>
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
