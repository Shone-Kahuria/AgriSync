import { useState } from "react";

const LOCATIONS = [
  "Nakuru", "Nairobi", "Kisumu", "Eldoret",
  "Meru", "Nyeri", "Kakamega", "Kitale", "Machakos", "Thika",
];

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [location, setLocation] = useState("Nakuru");
  const [error, setError]       = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) { setError("Phone number is required."); return; }
    if (mode === "signup" && !name.trim()) { setError("Full name is required."); return; }
    const user = {
      phone:    phone.trim(),
      name:     name.trim() || `Farmer ${phone.trim().slice(-4)}`,
      location,
    };
    localStorage.setItem("agrisync_user",  JSON.stringify(user));
    localStorage.setItem("agrisync_name",  user.name);
    localStorage.setItem("agrisync_phone", user.phone);
    onAuth(user);
  }

  function handleGuest() {
    const user = { phone: "", name: "Guest Farmer", location: "Nakuru" };
    localStorage.setItem("agrisync_user", JSON.stringify(user));
    onAuth(user);
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg-circle auth-bg-circle-1" />
      <div className="auth-bg-circle auth-bg-circle-2" />
      <div className="auth-bg-circle auth-bg-circle-3" />

      {/* Branding */}
      <div className="auth-logo-section">
        <div className="auth-logo-icon">🌿</div>
        <h1 className="auth-logo-name">AgriSync</h1>
        <p className="auth-logo-tag">AI-Powered Farm Advisor</p>
        <p className="auth-tagline">
          Diagnose crop diseases, find the best markets,<br />
          and receive bilingual farming guidance — built for Kenya.
        </p>
      </div>

      {/* Card */}
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === "login" ? " active" : ""}`}
            onClick={() => { setMode("login"); setError(null); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab${mode === "signup" ? " active" : ""}`}
            onClick={() => { setMode("signup"); setError(null); }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                placeholder="e.g. Wanjiku Kamau"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input
              className="form-input"
              type="tel"
              placeholder="+254 7XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Your region</label>
              <select
                className="form-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          )}

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary">
            {mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button className="btn btn-outline" onClick={handleGuest}>
          Continue as Guest
        </button>

        <p style={{ fontSize: 11, color: "var(--n400)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          Your data stays on your device. No password needed —<br />
          your phone number is your identity.
        </p>
      </div>

      {/* Pill badges */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center", zIndex: 1 }}>
        {["⚡ AMD MI300X", "🏆 Hackathon 2026", "🇰🇪 Built for Kenya"].map((b) => (
          <span
            key={b}
            style={{
              fontSize: 10.5, fontWeight: 600,
              background: "rgba(255,255,255,.12)",
              color: "rgba(255,255,255,.7)",
              padding: "5px 12px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,.2)",
            }}
          >
            {b}
          </span>
        ))}
      </div>

      <p className="auth-footer">AgriSync · Kenya Ministry of Agriculture partner project</p>
    </div>
  );
}
