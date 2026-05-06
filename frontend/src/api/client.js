const BASE = "/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export function diagnose(imageBase64, cropType) {
  return post("/diagnose", { image_base64: imageBase64, crop_type: cropType });
}

export function arbitrage(crop, volumeKg, originCity) {
  return post("/arbitrage", { crop, volume_kg: volumeKg, origin_city: originCity });
}

export function getInventory() {
  return get("/inventory");
}

export function getReport(diagnoseResult, arbitrageResult, farmerName, phone) {
  return post("/report", {
    diagnose_result: diagnoseResult,
    arbitrage_result: arbitrageResult,
    farmer_name: farmerName,
    phone,
  });
}

export function getGpuInfo() {
  return get("/gpu-info");
}

export function runFullPipeline(imageBase64, crop, volumeKg, originCity, farmerName, phone) {
  return post("/analyze", {
    image_base64: imageBase64,
    crop,
    volume_kg: volumeKg,
    origin_city: originCity,
    farmer_name: farmerName || null,
    phone: phone || null,
  });
}

export function reportDiagnosis(aiDiseaseName, actualDisease, aiConfidence, imageHash, phone, notes) {
  return post("/feedback/diagnosis", {
    ai_disease_name: aiDiseaseName,
    actual_disease: actualDisease || null,
    ai_confidence: aiConfidence || null,
    image_hash: imageHash || null,
    phone: phone || null,
    notes: notes || null,
  });
}

export function getCrops() {
  return get("/crops");
}

export function getDiseases(cropId) {
  const qs = cropId != null ? `?crop_id=${cropId}` : "";
  return get(`/diseases${qs}`);
}

export function registerFarmer(phone, name, county, primaryCrop) {
  return post("/farmers/register", { phone, name, county, primary_crop: primaryCrop });
}

export function getFarmerHistory(phone) {
  return get(`/farmers/${encodeURIComponent(phone)}/history`);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
