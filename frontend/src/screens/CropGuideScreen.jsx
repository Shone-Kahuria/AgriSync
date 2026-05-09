import { useState } from "react";

const DISEASES = [
  {
    id: 1,
    icon: "🌽",
    name: "Maize Lethal Necrosis (MLN)",
    swahili: "Ugonjwa wa Mahindi wa Mlipuko",
    region: "East Africa",
    crops: ["Maize"],
    severity: "high",
    symptoms: "Chlorotic (yellow-green) streaking from leaf margins, mosaic patterns, premature plant death. Plants may die before tasselling. All leaves affected from the oldest upward.",
    causes: "Co-infection of Maize Chlorotic Mottle Virus (MCMV) and a potyvirus (e.g. SCMV). Spread by thrips, aphids, and contaminated seed or tools.",
    prevention: "Use certified MLN-resistant seed varieties (e.g. DK8031, Pioneer 3253). Rotate crops with non-host plants. Control thrip and aphid vectors with approved insecticides. Destroy infected plants immediately.",
    treatments: ["Destroy and burn infected plants", "Apply imidacloprid-based insecticides to control vectors", "Plant MLN-tolerant hybrids in subsequent seasons"],
    pcpb: "approved",
  },
  {
    id: 2,
    icon: "🍅",
    name: "Tomato Late Blight",
    swahili: "Kuoza kwa Nyanya (Late Blight)",
    region: "Pan-Africa",
    crops: ["Tomato", "Potato"],
    severity: "high",
    symptoms: "Water-soaked, irregularly shaped lesions on leaves — turn dark brown/black. White fuzzy growth on underside of leaves in humid conditions. Fruit shows firm brown rot.",
    causes: "Oomycete pathogen Phytophthora infestans. Spreads rapidly in cool, moist weather (15–22°C) with high humidity. Airborne sporangia.",
    prevention: "Plant resistant varieties (e.g. Cal-J, Rambo F1). Stake plants for air circulation. Avoid overhead irrigation. Remove and destroy infected plant debris.",
    treatments: ["Metalaxyl + mancozeb (Ridomil Gold) — apply before/during rains", "Chlorothalonil (Daconil) as protective spray", "Remove infected leaves immediately"],
    pcpb: "approved",
  },
  {
    id: 3,
    icon: "🍌",
    name: "Banana Xanthomonas Wilt (BXW)",
    swahili: "Ugonjwa wa Ndizi (Bukenya)",
    region: "East & Central Africa",
    crops: ["Banana"],
    severity: "high",
    symptoms: "Yellow wilting of leaves starting from the inner crown. Yellow or brown ooze from cut stems. Premature ripening of fruit; internal browning of banana flesh.",
    causes: "Bacterium Xanthomonas vasicola pv. musacearum. Spread by contaminated cutting tools, insects visiting flowers, and infected planting material.",
    prevention: "Use clean, disease-free suckers. Sterilize cutting tools with bleach between plants. Remove male buds immediately after last hand sets. Single stem cultivation reduces spread.",
    treatments: ["No chemical cure — remove and destroy infected plants by uprooting", "Sterilize tools with 10% bleach solution", "Plant resistant varieties (e.g. FHIA-17, FHIA-23)"],
    pcpb: "unverified",
  },
  {
    id: 4,
    icon: "☕",
    name: "Coffee Berry Disease (CBD)",
    swahili: "Ugonjwa wa Kahawa (CBD)",
    region: "East Africa",
    crops: ["Coffee"],
    severity: "medium",
    symptoms: "Dark sunken lesions on green berries. Premature berry drop. Mummified black berries remaining on the branch. Lesions on stems in severe infections.",
    causes: "Fungus Colletotrichum kahawae. Spreads by rain splash during flowering and berry development. Most severe at altitudes 1,500–2,200m in highland regions.",
    prevention: "Plant resistant varieties (Ruiru 11, Batian). Maintain canopy management and pruning for air flow. Apply fungicide at 6–8 weeks after flowering.",
    treatments: ["Copper-based fungicides at critical periods (6, 10, 14 weeks post-flowering)", "Antracol (propineb) as protective spray", "Harvest all berries including mummies"],
    pcpb: "approved",
  },
  {
    id: 5,
    icon: "🍠",
    name: "Cassava Mosaic Disease (CMD)",
    swahili: "Ugonjwa wa Muhogo (Mozaiki)",
    region: "Sub-Saharan Africa",
    crops: ["Cassava"],
    severity: "high",
    symptoms: "Mosaic and chlorotic patterns on leaves — yellow-green mottling. Leaf distortion, reduced leaf size, stunted plant growth. Severely affected plants produce undersized tubers.",
    causes: "Cassava Mosaic Begomoviruses (CMBVs) transmitted by the whitefly Bemisia tabaci. Also spread through infected stem cuttings. Pandemics have caused massive yield losses across Africa.",
    prevention: "Use virus-free, certified stem cuttings. Plant CMD-resistant varieties (e.g. NASE 14, TME 419). Rogue out infected plants early. Control whitefly populations with yellow sticky traps.",
    treatments: ["Remove and burn infected plants immediately", "Apply neonicotinoid insecticides to control whitefly vectors", "Source clean planting material from certified nurseries"],
    pcpb: "approved",
  },
  {
    id: 6,
    icon: "🌾",
    name: "Fall Armyworm (FAW)",
    swahili: "Viwavi Jeshi (Fall Armyworm)",
    region: "Pan-Africa",
    crops: ["Maize", "Sorghum", "Wheat", "Rice"],
    severity: "high",
    symptoms: "Irregular holes and 'window pane' feeding on leaves. Frass (sawdust-like excrement) in leaf whorls. Defoliation of young plants. In maize, larvae burrow into cobs causing direct grain loss.",
    causes: "Moth Spodoptera frugiperda, an invasive pest first detected in Africa in 2016. Now present in all 54 African nations. Adults migrate hundreds of kilometres on wind currents.",
    prevention: "Early scouting — check whorls of young plants twice weekly. Use push-pull intercropping with Desmodium and Napier grass. Release natural enemies (parasitoid wasps). Pheromone traps for adult monitoring.",
    treatments: ["Emamectin benzoate (Escort) applied to whorls at first instar larvae", "Spinetoram (Radiant) — IRAC Group 5 to manage resistance", "Bacillus thuringiensis (Bt) biopesticide for organic systems"],
    pcpb: "approved",
  },
  {
    id: 7,
    icon: "🥜",
    name: "Groundnut Rosette Disease",
    swahili: "Ugonjwa wa Karanga (Rosette)",
    region: "West & East Africa",
    crops: ["Groundnut"],
    severity: "high",
    symptoms: "Chlorotic rosette: yellow-green mottling, bushy appearance from shortened internodes. Severely stunted plants. Chlorotic form (yellow) and green form (normal-coloured leaves, mosaic symptoms).",
    causes: "Groundnut Rosette Virus (GRV) complex, transmitted by aphid Aphis craccivora. Satellite RNA and a helper virus act together. Spreads very rapidly in dense plantings.",
    prevention: "Early planting at onset of rains to escape peak aphid pressure. Use resistant varieties (RG 1, Serenut series). Maintain plant spacing to reduce aphid movement. Intercrop with cereals as barrier.",
    treatments: ["No curative chemical treatment — prevention is key", "Apply dimethoate insecticide to manage aphid vectors", "Remove and destroy infected plants to limit spread"],
    pcpb: "unverified",
  },
  {
    id: 8,
    icon: "🌾",
    name: "Wheat Stem Rust (Ug99)",
    swahili: "Kutu ya Ngano",
    region: "East Africa",
    crops: ["Wheat"],
    severity: "high",
    symptoms: "Reddish-brown pustules on stems, leaves, and leaf sheaths. Pustules rupture to release brick-red spores. Severely infected plants lodge (fall over). Shrivelled grain.",
    causes: "Fungus Puccinia graminis f. sp. tritici. Ug99 race is particularly aggressive. Spread by wind over long distances. Favoured by temperatures 15–25°C with dew.",
    prevention: "Plant Ug99-resistant varieties (e.g. Fahari, Farida). Avoid late planting. Monitor regional rust alerts from CIMMYT / national research institutes.",
    treatments: ["Propiconazole (Tilt 250 EC) — apply at first sign of infection", "Tebuconazole at heading stage", "Epoxiconazole + carbendazim for severe cases"],
    pcpb: "approved",
  },
  {
    id: 9,
    icon: "🥔",
    name: "Potato Early Blight",
    swahili: "Ugonjwa wa Viazi (Early Blight)",
    region: "East & Southern Africa",
    crops: ["Potato", "Tomato"],
    severity: "medium",
    symptoms: "Brown circular target-like spots (concentric rings) on older leaves. Yellow area surrounds spots. Defoliation from the bottom up. Reduced tuber size if severe.",
    causes: "Fungus Alternaria solani. Thrives in warm days and cool nights. Weakened plants from nutrient stress are more susceptible.",
    prevention: "Plant certified seed tubers. Apply balanced fertilizer — adequate potassium reduces susceptibility. Avoid excessive nitrogen. Use 3-year crop rotation.",
    treatments: ["Mancozeb (Dithane M-45) protective spray every 7–10 days", "Azoxystrobin (Amistar) for curative treatment", "Remove and dispose of severely infected leaves"],
    pcpb: "approved",
  },
  {
    id: 10,
    icon: "🌾",
    name: "Striga (Witchweed)",
    swahili: "Kayamba / Gugu la Kunyonya",
    region: "Sub-Saharan Africa",
    crops: ["Maize", "Sorghum", "Millet", "Rice"],
    severity: "high",
    symptoms: "Yellowing and wilting of host crop despite adequate moisture. Severely stunted growth, yellowing leaves, premature senescence. Small purple, pink or white flowers emerge from soil near crop roots.",
    causes: "Parasitic plants (Striga hermonthica, S. asiatica, S. gesnerioides) attach to crop roots, draining water and nutrients. Seeds persist in soil for 15–20 years. Infests an estimated 21 million hectares across Africa.",
    prevention: "Use IMAZAPYR-resistant maize varieties (IR Maize) treated with low-dose imazapyr. Practice push-pull with Desmodium (green manure that suppresses Striga germination). Intercrop with trap crops (Sorghum bicolor cv. SRN39).",
    treatments: ["Hand-pull Striga before flowering to prevent seed set", "Apply low-dose imazapyr herbicide with IR maize seed treatment", "Apply Fusarium oxysporum f. sp. strigae (biological control)"],
    pcpb: "restricted",
  },
  {
    id: 11,
    icon: "🫘",
    name: "Bean Angular Leaf Spot",
    swahili: "Madoa ya Maharagwe",
    region: "East & Central Africa",
    crops: ["Beans"],
    severity: "medium",
    symptoms: "Angular, brown to grey spots on leaves bounded by leaf veins. Spots have yellow halos. Brown lesions on pods and seeds. Defoliation in severe cases.",
    causes: "Fungus Pseudocercospora griseola (formerly Phaeoisariopsis griseola). Seed-borne; spreads by rain splash and wind. Persists in crop debris.",
    prevention: "Use certified disease-free seed. Practice crop rotation (2–3 years). Space plants adequately for air circulation. Remove crop debris after harvest.",
    treatments: ["Mancozeb + copper oxychloride spray every 10–14 days", "Benomyl for curative treatment", "Avoid working in wet fields to limit spread"],
    pcpb: "approved",
  },
  {
    id: 12,
    icon: "🌾",
    name: "Rice Yellow Mottle Virus (RYMV)",
    swahili: "Ugonjwa wa Njano wa Mchele",
    region: "West & East Africa",
    crops: ["Rice"],
    severity: "high",
    symptoms: "Yellowing and mottling of leaves starting with youngest leaves. Severe stunting. Spikelet sterility leading to empty grains. Plants may die in very susceptible varieties.",
    causes: "Rice Yellow Mottle Sobemovirus. Transmitted by insects (beetles, grasshoppers) and contact with infected plant sap. Persists in weed hosts. Major constraint to rice production in sub-Saharan Africa.",
    prevention: "Plant resistant varieties (e.g. WITA 4, NERICA). Control insect vectors. Avoid waterlogging that encourages vector activity. Remove weed hosts from field margins.",
    treatments: ["No curative treatment — management is preventive", "Rogue infected plants in early growth stages", "Spray pyrethroid insecticides to reduce vector populations"],
    pcpb: "unverified",
  },
];

const SEV_STYLE = {
  high:   { bg: "#fee2e2", color: "#dc2626", label: "High Severity" },
  medium: { bg: "#fef3c7", color: "#d97706", label: "Medium Severity" },
  low:    { bg: "#dcfce7", color: "#16a34a", label: "Low Severity" },
};

const PCPB_STYLE = {
  approved:   { bg: "#dcfce7", color: "#15803d", label: "✓ Reg. Approved" },
  restricted: { bg: "#fee2e2", color: "#dc2626", label: "⚠ Restricted" },
  unverified: { bg: "#fef3c7", color: "#d97706", label: "? Verify Locally" },
};

const ALL_CROPS = [
  "All", "Maize", "Tomato", "Cassava", "Potato", "Beans",
  "Coffee", "Banana", "Wheat", "Groundnut", "Rice", "Sorghum",
];

export default function CropGuideScreen() {
  const [query,    setQuery]    = useState("");
  const [filter,   setFilter]   = useState("All");
  const [expanded, setExpanded] = useState(null);

  const visible = DISEASES.filter((d) => {
    const matchFilter = filter === "All" || d.crops.includes(filter);
    const matchQuery  =
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.crops.some((c) => c.toLowerCase().includes(query.toLowerCase())) ||
      d.symptoms.toLowerCase().includes(query.toLowerCase()) ||
      d.region.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="page-header">
        <h2 className="page-title">Crop Disease Guide</h2>
        <p className="page-sub">Searchable library of {DISEASES.length} diseases affecting African crops</p>
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

      {/* Crop filter */}
      <div className="guide-filters">
        {ALL_CROPS.map((c) => (
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

      {/* Disease entries */}
      {visible.length === 0 && (
        <div className="empty-state" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="empty-icon">🔍</div>
          <p className="empty-title">No results</p>
          <p className="empty-text">Try a different crop or symptom keyword.</p>
        </div>
      )}

      {visible.map((d) => {
        const sev  = SEV_STYLE[d.severity];
        const pcpb = PCPB_STYLE[d.pcpb];
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
                  <span className="guide-entry-tag" style={{ background: "#f0fdf4", color: "#15803d" }}>
                    🌍 {d.region}
                  </span>
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

                <p className="guide-section-title">Symptoms</p>
                <p className="guide-section-text">{d.symptoms}</p>

                <p className="guide-section-title">Causes & Spread</p>
                <p className="guide-section-text">{d.causes}</p>

                <p className="guide-section-title">Prevention</p>
                <p className="guide-section-text">{d.prevention}</p>

                <p className="guide-section-title">Treatments</p>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {d.treatments.map((t, i) => (
                    <li key={i} style={{ fontSize: 13, color: "var(--n700)", lineHeight: 1.7 }}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer note */}
      <div className="disclaimer-box" style={{ marginTop: 8 }}>
        ℹ️ Treatment status is indicative only. Always confirm registration with your country's national regulatory body (e.g. PCPB-Kenya, NAQS-Nigeria, EPA-Ghana) before purchase. Consult a certified agronomist for complex cases.
      </div>
    </div>
  );
}
