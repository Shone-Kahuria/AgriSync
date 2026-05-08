import { useState } from "react";

const LOCATIONS = [
  "Nakuru", "Nairobi", "Kisumu", "Eldoret",
  "Meru", "Nyeri", "Kakamega", "Kitale", "Machakos", "Thika",
];

export default function ProfileScreen({ user, onUserUpdate, onLogout }) {
  const [name,     setName]     = useState(user?.name || "");
  const [phone,    setPhone]    = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "Nakuru");
  const [smsOn,    setSmsOn]    = useState(
    () => localStorage.getItem("agrisync_sms") !== "false"
  );
  const [swahiliOn, setSwahiliOn] = useState(
    () => localStorage.getItem("agrisync_swahili") === "true"
  );
  const [saved, setSaved] = useState(false);

  const diagCount = Number(localStorage.getItem("agrisync_diag_count") || 0);
  const mktCount  = Number(localStorage.getItem("agrisync_mkt_count")  || 0);
  const initials  = name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "🌿";

  function handleSave(e) {
    e.preventDefault();
    const updated = { phone, name, location };
    localStorage.setItem("agrisync_user",  JSON.stringify(updated));
    localStorage.setItem("agrisync_name",  name);
    localStorage.setItem("agrisync_phone", phone);
    localStorage.setItem("agrisync_sms",   String(smsOn));
    localStorage.setItem("agrisync_swahili", String(swahiliOn));
    onUserUpdate?.(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleLogout() {
    if (confirm("Sign out of AgriSync?")) {
      localStorage.removeItem("agrisync_user");
      onLogout?.();
    }
  }

  function toggleSms() {
    const next = !smsOn;
    setSmsOn(next);
    localStorage.setItem("agrisync_sms", String(next));
  }

  function toggleSwahili() {
    const next = !swahiliOn;
    setSwahiliOn(next);
    localStorage.setItem("agrisync_swahili", String(next));
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <p className="profile-name">{name || "Farmer"}</p>
        {phone && <p className="profile-phone">{phone}</p>}
        <p className="profile-location">📍 {location}</p>
      </div>

      {/* Activity stats */}
      <div className="profile-stat-grid">
        <div className="profile-stat">
          <p className="profile-stat-val">{diagCount}</p>
          <p className="profile-stat-lbl">Diagnoses run</p>
        </div>
        <div className="profile-stat">
          <p className="profile-stat-val">{mktCount}</p>
          <p className="profile-stat-lbl">Market queries</p>
        </div>
      </div>

      {/* Edit profile form */}
      <form onSubmit={handleSave}>
        <div className="profile-section">
          <div className="profile-section-header">
            <p className="profile-section-title">Personal Details</p>
          </div>

          <div className="profile-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                placeholder="e.g. Wanjiku Kamau"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
            <div className="form-group">
              <label className="form-label">Region</label>
              <select
                className="form-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {saved && (
          <div className="report-confirm" style={{ marginBottom: 14 }}>
            ✓ Profile saved successfully.
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginBottom: 14 }}>
          Save Changes
        </button>
      </form>

      {/* Preferences */}
      <div className="profile-section">
        <div className="profile-section-header">
          <p className="profile-section-title">Preferences</p>
        </div>

        <div className="profile-row">
          <div>
            <p className="profile-row-label">📱 SMS Alerts</p>
            <p className="profile-row-sub">Receive crop disease alerts via SMS</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={smsOn} onChange={toggleSms} />
            <span className="toggle-track" />
          </label>
        </div>

        <div className="profile-row">
          <div>
            <p className="profile-row-label">🇰🇪 Swahili First</p>
            <p className="profile-row-sub">Show Swahili summaries before English</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={swahiliOn} onChange={toggleSwahili} />
            <span className="toggle-track" />
          </label>
        </div>
      </div>

      {/* About */}
      <div className="profile-section">
        <div className="profile-section-header">
          <p className="profile-section-title">About AgriSync</p>
        </div>
        {[
          { label: "Version",      value: "1.0.0" },
          { label: "AI Model",     value: "Llama 3.2 Vision" },
          { label: "GPU Backend",  value: "AMD MI300X / ROCm" },
          { label: "Market Data",  value: "KACE · WFP" },
          { label: "Languages",    value: "English + Swahili" },
          { label: "Built for",    value: "AMD Hackathon 2026" },
        ].map(({ label, value }) => (
          <div key={label} className="profile-row">
            <p className="profile-row-label" style={{ fontWeight: 500, color: "var(--n600)" }}>{label}</p>
            <p className="profile-row-value">{value}</p>
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        className="btn btn-outline"
        style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
        onClick={handleLogout}
      >
        Sign Out
      </button>
    </div>
  );
}
