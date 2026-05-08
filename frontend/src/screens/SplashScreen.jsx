import { useEffect, useState } from "react";

const BADGES = ["⚡ AMD MI300X", "🇰🇪 Built for Kenya", "🏆 Hackathon 2026"];

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in"); // "in" → "out"

  useEffect(() => {
    const fadeTimer    = setTimeout(() => setPhase("out"), 2600);
    const doneTimer    = setTimeout(onDone, 3200);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`splash-screen${phase === "out" ? " fading" : ""}`}>
      {/* Concentric pulsing rings */}
      <div className="splash-rings">
        <div className="splash-ring splash-ring-1" />
        <div className="splash-ring splash-ring-2" />
        <div className="splash-ring splash-ring-3" />
        <div className="splash-ring splash-ring-4" />
        <div className="splash-glow" />
      </div>

      {/* Logo icon */}
      <div className="splash-logo-icon">🌿</div>

      {/* Wordmark */}
      <p className="splash-wordmark">AgriSync</p>
      <p className="splash-tagline">AI Farm Advisor</p>

      {/* Animated dots */}
      <div className="splash-dots">
        <div className="splash-dot" />
        <div className="splash-dot" />
        <div className="splash-dot" />
      </div>

      {/* Badges */}
      <div className="splash-badges">
        {BADGES.map((b) => (
          <span key={b} className="splash-badge">{b}</span>
        ))}
      </div>
    </div>
  );
}
