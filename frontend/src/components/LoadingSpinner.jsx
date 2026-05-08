export default function LoadingSpinner({ label = "Analyzing on AMD MI300X…" }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner-rings">
        <div className="spinner-ring-outer" />
        <div className="spinner-ring-inner" />
        <div className="spinner-core" />
      </div>
      <div>
        <p className="spinner-label">{label}</p>
        <p className="spinner-sub">Powered by AMD ROCm GPU acceleration</p>
      </div>
    </div>
  );
}
