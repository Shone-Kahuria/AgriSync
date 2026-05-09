import { useState } from "react";

const STEPS = [
  {
    icon: "🔬",
    color: "#22c55e",
    title: "Diagnose Crop Disease",
    desc: "Take or upload a photo of your crop. Our AI identifies the disease in seconds and recommends regulator-approved treatments — in English and your local language.",
  },
  {
    icon: "📊",
    color: "#3b82f6",
    title: "Find the Best Market",
    desc: "Enter your crop and volume. AgriSync compares prices across markets near you and calculates your net profit after transport costs — so you always sell at the right place.",
  },
  {
    icon: "🌍",
    color: "#8b5cf6",
    title: "Built for All of Africa",
    desc: "From Lagos to Nairobi, Accra to Johannesburg — AgriSync supports farmers across 54 African nations with localised data, bilingual reports, and SMS delivery.",
  },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep]       = useState(0);
  const [exiting, setExiting] = useState(false);

  function advance() {
    if (step < STEPS.length - 1) {
      setExiting(true);
      setTimeout(() => { setStep((s) => s + 1); setExiting(false); }, 220);
    } else {
      finish();
    }
  }

  function finish() {
    localStorage.setItem("agrisync_onboarded", "1");
    onDone?.();
  }

  const s = STEPS[step];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to AgriSync">
      <div className={`onboarding-card${exiting ? " exiting" : ""}`}>
        <div
          className="onboarding-icon-wrap"
          style={{ background: s.color + "18", border: `2px solid ${s.color}40` }}
        >
          <span style={{ fontSize: 36 }}>{s.icon}</span>
        </div>

        <p className="onboarding-title">{s.title}</p>
        <p className="onboarding-desc">{s.desc}</p>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot${i === step ? " active" : ""}`}
              style={i === step ? { background: s.color } : {}}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={finish}>Skip</button>
          <button
            className="onboarding-next"
            style={{ background: s.color }}
            onClick={advance}
          >
            {step < STEPS.length - 1 ? "Next →" : "Get Started →"}
          </button>
        </div>
      </div>
    </div>
  );
}
