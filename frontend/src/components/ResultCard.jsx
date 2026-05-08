export default function ResultCard({ title, accent = "#16a34a", icon = null, children }) {
  return (
    <div className="card">
      {title && (
        <div
          className="card-header"
          style={{ background: accent + "14", borderBottom: `1px solid ${accent}22` }}
        >
          {icon && <span className="card-header-icon">{icon}</span>}
          <span className="card-title" style={{ color: accent }}>{title}</span>
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
