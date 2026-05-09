import { useState, useEffect } from "react";
import { getDiseases } from "../api/client";

/* ── Static fallback data (shown while API loads or if backend is down) ── */
const STATIC_DISEASES = [
  {
    id: "s1", icon: "🌽", name: "Maize Lethal Necrosis (MLN)",
    swahili: "Ugonjwa wa Mahindi wa Mlipuko", region: "East Africa",
    crops: ["Maize"], severity: "high",
    symptoms: "Chlorotic streaking from leaf margins, mosaic patterns, premature plant death.",
    causes: "Co-infection of MCMV and a potyvirus. Spread by thrips, aphids, contaminated seed.",
    prevention: "Use certified MLN-resistant varieties. Rotate crops. Control vector insects.",
    treatments: ["Destroy and burn infected plants", "Apply imidacloprid to control vectors"],
    pcpb: "approved",
  },
  {
    id: "s2", icon: "🍠", name: "Cassava Mosaic Disease (CMD)",
    swahili: "Ugonjwa wa Mosaic ya Muhogo", region: "Sub-Saharan Africa",
    crops: ["Cassava"], severity: "high",
    symptoms: "Yellow-green mosaic on leaves, leaf distortion, stunted growth, undersized tubers.",
    causes: "Cassava Mosaic Begomoviruses transmitted by whitefly Bemisia tabaci.",
    prevention: "Use virus-free certified stem cuttings. Plant CMD-resistant varieties.",
    treatments: ["Remove and burn infected plants", "Apply neonicotinoids to control whitefly"],
    pcpb: "approved",
  },
  {
    id: "s3", icon: "🌾", name: "Fall Armyworm (FAW)",
    swahili: "Viwavi Jeshi", region: "Pan-Africa",
    crops: ["Maize", "Sorghum", "Wheat", "Rice"], severity: "high",
    symptoms: "Holes in leaves, frass in whorls, defoliation, larvae burrow into cobs.",
    causes: "Moth Spodoptera frugiperda. Present in all 54 African nations since 2016.",
    prevention: "Push-pull intercropping with Desmodium. Scout whorls twice weekly.",
    treatments: ["Emamectin benzoate (Escort) into whorls", "Bacillus thuringiensis for organic"],
    pcpb: "approved",
  },
];

/* ── Crop → emoji mapping ────────────────────────────────────────────── */
const CROP_ICONS = {
  Maize: "🌽", Tomato: "🍅", Beans: "🫘", Potato: "🥔",
  Cassava: "🍠", Coffee: "☕", Kale: "🥬", "Sweet Potato": "🍠",
  Sorghum: "🌾", Banana: "🍌", Wheat: "🌾", Onion: "🧅",
  Groundnut: "🥜", Rice: "🌾",
};

const SEV_STYLE = {
  high:    { bg: "#fee2e2", color: "#dc2626", label: "High Severity" },
  medium:  { bg: "#fef3c7", color: "#d97706", label: "Medium Severity" },
  low:     { bg: "#dcfce7", color: "#16a34a", label: "Low Severity" },
  unknown: { bg: "#f3f4f6", color: "#6b7280", label: "Unknown" },
};

const PCPB_STYLE = {
  approved:   { bg: "#dcfce7", color: "#15803d", label: "✓ Reg. Approved" },
  restricted: { bg: "#fee2e2", color: "#dc2626", label: "⚠ Restricted" },
  unverified: { bg: "#fef3c7", color: "#d97706", label: "? Verify Locally" },
};

/* Derive overall pcpb status from treatment list */
function derivePcpb(treatments) {
  if (!treatments?.length) return "unverified";
  const statuses = treatments.map((t) => t.pcpb_status || t);
  if (statuses.includes("restricted")) return "restricted";
  if (statuses.includes("approved")) return "approved";
  return "unverified";
}

/* Map API DiseaseListItem → component disease format */
function fromApi(d) {
  return {
    id: d.id,
    icon: CROP_ICONS[d.crop_name] || "🌿",
    name: d.name,
    swahili: d.name_sw || null,
    region: "Africa",
    crops: [d.crop_name].filter(Boolean),
    severity: d.severity || "medium",
    symptoms: d.symptoms || "",
    causes: null,
    prevention: null,
    treatments: d.treatments.map((t) => t.name),
    pcpb: derivePcpb(d.treatments),
  };
}

export default function CropGuideScreen() {
  const [query,    setQuery]    = useState("");
  const [filter,   setFilter]   = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [diseases, setDiseases] = useState(STATIC_DISEASES);
  const [loading,  setLoading]  = useState(true);
  const [source,   setSource]   = useState("static"); // "api" | "static"

  useEffect(() => {
    getDiseases()
      .then((data) => {
        if (data?.length) {
          setDiseases(data.map(fromApi));
          setSource("api");
        }
      })
      .catch(() => {
        /* backend down — keep static fallback silently */
      })
      .finally(() => setLoading(false));
  }, []);

  /* Dynamic crop filter from loaded diseases */
  const allCrops = ["All", ...new Set(diseases.flatMap((d) => d.crops))].sort(
    (a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b))
  );

  const visible = diseases.filter((d) => {
    const matchFilter = filter === "All" || d.crops.includes(filter);
    const matchQuery  =
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.crops.some((c) => c.toLowerCase().includes(query.toLowerCase())) ||
      (d.symptoms || "").toLowerCase().includes(query.toLowerCase()) ||
      (d.region || "").toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="page-header">
        <h2 className="page-title">Crop Disease Guide</h2>
        <p className="page-sub">
          {loading
            ? "Loading disease library…"
            : `${diseases.length} diseases · ${source === "api" ? "Live from database" : "Offline mode"}`}
        </p>
      </div>

      {/* Search */}
      <div className="guide-search-wrap">
        <span className="guide-search-icon">🔍</span>
        <input
          className="guide-search"
          placeholder="Search by disease, crop, symptom, or region…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Dynamic crop filter */}
      <div className="guide-filters">
        {allCrops.map((c) => (
          <button
            key={c}
            className={`guide-filter${filter === c ? " active" : ""}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p style={{ fontSize: 11.5, color: "var(--n400)", marginBottom: 12, fontWeight: 500 }}>
        {visible.length} result{visible.length !== 1 ? "s" : ""}
        {(query || filter !== "All") && " matching your filters"}
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--n400)", fontSize: 13 }}>
          Loading disease library…
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="empty-state" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="empty-icon">🔍</div>
          <p className="empty-title">No results</p>
          <p className="empty-text">Try a different crop or symptom keyword.</p>
        </div>
      )}

      {visible.map((d) => {
        const sev  = SEV_STYLE[d.severity] || SEV_STYLE.unknown;
        const pcpb = PCPB_STYLE[d.pcpb]   || PCPB_STYLE.unverified;
        const open = expanded === d.id;

        return (
          <div key={d.id} className="guide-entry">
            <div
              className="guide-entry-header"
              onClick={() => setExpanded(open ? null : d.id)}
              role="button"
              aria-expanded={open}
            >
              <span className="guide-entry-icon">{d.icon}</span>
              <div className="guide-entry-meta">
                <p className="guide-entry-name">{d.name}</p>
                <div className="guide-entry-tags">
                  {d.crops.map((c) => (
                    <span key={c} className="guide-entry-tag" style={{ background: "var(--n100)", color: "var(--n600)" }}>
                      {c}
                    </span>
                  ))}
                  {d.region && (
                    <span className="guide-entry-tag" style={{ background: "#f0fdf4", color: "#15803d" }}>
                      🌍 {d.region}
                    </span>
                  )}
                  <span className="guide-entry-tag" style={{ background: sev.bg, color: sev.color }}>
                    {sev.label}
                  </span>
                  <span className="guide-entry-tag" style={{ background: pcpb.bg, color: pcpb.color }}>
                    {pcpb.label}
                  </span>
                </div>
              </div>
              <span className={`guide-entry-chevron${open ? " open" : ""}`}>▾</span>
            </div>

            {open && (
              <div className="guide-entry-body">
                {d.swahili && (
                  <p style={{ fontSize: 11.5, color: "var(--teal)", fontStyle: "italic", marginBottom: 10, fontWeight: 600 }}>
                    🌍 {d.swahili}
                  </p>
                )}

                {d.symptoms && (
                  <>
                    <p className="guide-section-title">Symptoms</p>
                    <p className="guide-section-text">{d.symptoms}</p>
                  </>
                )}

                {d.causes && (
                  <>
                    <p className="guide-section-title">Causes & Spread</p>
                    <p className="guide-section-text">{d.causes}</p>
                  </>
                )}

                {d.prevention && (
                  <>
                    <p className="guide-section-title">Prevention</p>
                    <p className="guide-section-text">{d.prevention}</p>
                  </>
                )}

                {d.treatments?.length > 0 && (
                  <>
                    <p className="guide-section-title">Treatments</p>
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {d.treatments.map((t, i) => (
                        <li key={i} style={{ fontSize: 13, color: "var(--n700)", lineHeight: 1.7 }}>{t}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="disclaimer-box" style={{ marginTop: 8 }}>
        ℹ️ Treatment status is indicative only. Always confirm registration with your country's national regulatory body (PCPB-Kenya, NAQS-Nigeria, EPA-Ghana, etc.) before purchase. Consult a certified agronomist for complex cases.
      </div>
    </div>
  );
}
