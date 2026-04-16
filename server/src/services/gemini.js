const { GoogleGenerativeAI } = require("@google/generative-ai")

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini API timeout")), timeoutMs)),
  ])
}

const apiKey = process.env.GEMINI_API_KEY
let genAI = null
if (apiKey && apiKey.trim()) {
  genAI = new GoogleGenerativeAI(apiKey)
}

function normalizeModelName(name) {
  const raw = (name || "").trim()
  if (!raw) return ""
  // The REST API lists names like "models/gemini-2.0-flash". The SDK expects just "gemini-2.0-flash".
  return raw.startsWith("models/") ? raw.slice("models/".length) : raw
}

function isTransientGeminiError(err) {
  const msg = String(err?.message || err || "")
  return (
    msg.includes("[503") ||
    msg.includes("503") ||
    msg.toLowerCase().includes("service unavailable") ||
    msg.toLowerCase().includes("high demand") ||
    msg.includes("[429") ||
    msg.includes("429") ||
    msg.toLowerCase().includes("resource exhausted") ||
    msg.toLowerCase().includes("rate limit")
  )
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function getCandidateModelNames() {
  // Keep this list aligned with what the API key can actually access.
  // Prefer "lite" + "latest" aliases for stability on free tier.
  return [
    process.env.GEMINI_MODEL,
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    // Higher demand; keep last as best-effort
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-pro-latest",
    "gemini-2.5-pro",
  ]
    .map((n) => normalizeModelName(n))
    .filter((n, idx, arr) => n && arr.indexOf(n) === idx)
}

function getModel(name) {
  return genAI.getGenerativeModel({
    model: name,
    generationConfig: {
      // Strongly nudges the API toward strict JSON output.
      // If unsupported for a model, the SDK will error and we'll fall back.
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  })
}

// Resolve a working model (cached, but auto-recovers on errors)
let resolvedModelName = null
async function resolveModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY is not configured")
  if (resolvedModelName) return resolvedModelName

  const candidates = getCandidateModelNames()
  let lastErr = null
  for (const name of candidates) {
    try {
      const model = getModel(name)
      const probe = await withTimeout(model.generateContent("OK"), 7000)
      const txt = probe?.response?.text?.() || ""
      if (txt && txt.trim().length > 0) {
        resolvedModelName = name
        return resolvedModelName
      }
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error("No compatible Gemini model found")
}

async function generateWithFallback(prompt, { timeoutMs = 15000 } = {}) {
  if (!genAI) throw new Error("GEMINI_API_KEY is not configured")

  const candidates = getCandidateModelNames()
  // If we previously resolved a model, try it first.
  const primary = resolvedModelName ? [resolvedModelName] : []
  const ordered = [...primary, ...candidates.filter((m) => m !== resolvedModelName)]

  let lastErr = null
  for (const name of ordered) {
    const model = getModel(name)

    // Up to 3 attempts on transient errors for this model.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await withTimeout(model.generateContent(prompt), timeoutMs)
        const response = await result.response
        const text = response.text()
        if (!text || text.trim().length === 0) throw new Error("Empty response from Gemini")
        resolvedModelName = name
        return text
      } catch (err) {
        lastErr = err
        // 404/400 means the model name or config isn't supported; try next model.
        const msg = String(err?.message || err || "")
        const isNotFound = msg.includes("[404") || msg.includes("404")
        const isBadRequest = msg.includes("[400") || msg.includes("400")
        if (isNotFound || isBadRequest) break

        if (!isTransientGeminiError(err)) break
        // Exponential backoff with jitter
        const backoffMs = Math.min(2000 * 2 ** attempt + Math.floor(Math.random() * 250), 6000)
        await sleep(backoffMs)
      }
    }
  }

  // If our cached model is failing, clear it for next request.
  resolvedModelName = null
  throw lastErr || new Error("Gemini generation failed")
}

function parseJSONObject(rawText) {
  const jsonMatch = String(rawText || "").match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Could not parse JSON object from Gemini response")
  }
  return JSON.parse(jsonMatch[0])
}

function sanitizeStringArray(value, maxItems = 6) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (item == null ? "" : String(item).trim()))
    .filter((item) => item.length > 0)
    .slice(0, maxItems)
}

function normalizeRiskLevel(value) {
  const v = String(value || "").trim().toLowerCase()
  if (v === "high") return "High"
  if (v === "medium") return "Medium"
  if (v === "low") return "Low"
  return "Medium"
}

function normalizeSymptoms(symptoms) {
  if (!Array.isArray(symptoms)) return []
  return symptoms
    .map((s) => String(s || "").trim().toLowerCase())
    .filter((s) => s.length > 0)
}

function evaluateSymptomEscalation(symptoms) {
  const normalized = normalizeSymptoms(symptoms)
  const criticalPatterns = [
    { label: "chest pain", regex: /\bchest pain\b|\bchest tightness\b/ },
    { label: "shortness of breath", regex: /\bshortness of breath\b|\bbreathless\b|\bdifficulty breathing\b/ },
    { label: "neurological deficits", regex: /\bweakness on one side\b|\bslurred speech\b|\bfacial droop\b|\bneurologic|\bneurological\b/ },
    { label: "severe dizziness", regex: /\bsevere dizziness\b|\bvertigo\b|\bfainting\b|\bsyncope\b/ },
  ]

  const matched = []
  for (const symptom of normalized) {
    for (const pattern of criticalPatterns) {
      if (pattern.regex.test(symptom)) {
        matched.push(pattern.label)
      }
    }
  }

  return {
    hasCriticalSymptoms: matched.length > 0,
    criticalSymptoms: [...new Set(matched)],
  }
}

function evaluateModerateAbnormalities(healthData) {
  const sys = Number(healthData?.bloodPressureSystolic)
  const dia = Number(healthData?.bloodPressureDiastolic)
  const glucose = Number(healthData?.glucose)
  const cholesterol = Number(healthData?.cholesterol)
  let count = 0
  const findings = []

  if (
    Number.isFinite(sys) &&
    Number.isFinite(dia) &&
    ((sys >= 130 && sys <= 180) || (dia >= 80 && dia <= 120))
  ) {
    count += 1
    findings.push("elevated blood pressure")
  }
  if (Number.isFinite(glucose) && glucose >= 100 && glucose <= 300) {
    count += 1
    findings.push("elevated glucose")
  }
  if (Number.isFinite(cholesterol) && cholesterol >= 200 && cholesterol < 300) {
    count += 1
    findings.push("elevated cholesterol")
  }

  return {
    hasMultipleModerates: count >= 2,
    moderateCount: count,
    findings,
  }
}

function evaluateNearEmergencyRisk(healthData) {
  const sys = Number(healthData?.bloodPressureSystolic)
  const dia = Number(healthData?.bloodPressureDiastolic)
  const glucose = Number(healthData?.glucose)
  const cholesterol = Number(healthData?.cholesterol)
  const findings = []

  if (Number.isFinite(sys) && sys >= 170 && sys <= 180) findings.push("systolic BP near crisis threshold")
  if (Number.isFinite(dia) && dia >= 110 && dia <= 120) findings.push("diastolic BP near crisis threshold")
  if (Number.isFinite(glucose) && glucose >= 260 && glucose <= 300) findings.push("glucose near critical threshold")
  if (Number.isFinite(cholesterol) && cholesterol >= 280 && cholesterol < 300) findings.push("cholesterol near extreme threshold")

  return {
    isNearEmergency: findings.length > 0,
    findings,
  }
}

function evaluateEmergencyOverride(healthData) {
  const sys = Number(healthData?.bloodPressureSystolic)
  const dia = Number(healthData?.bloodPressureDiastolic)
  const glucose = Number(healthData?.glucose)
  const cholesterol = Number(healthData?.cholesterol)
  const triggers = []

  if (Number.isFinite(sys) && Number.isFinite(dia) && (sys > 180 || dia > 120)) {
    triggers.push("Hypertensive crisis threshold exceeded")
  }
  if (Number.isFinite(glucose) && glucose > 300) {
    triggers.push("Critical hyperglycemia threshold exceeded")
  }
  if (Number.isFinite(cholesterol) && cholesterol >= 300) {
    triggers.push("Severely elevated cholesterol threshold exceeded")
  }

  return {
    isEmergency: triggers.length > 0,
    triggers,
  }
}

function buildSafeFallback(healthData, reason) {
  const emergency = evaluateEmergencyOverride(healthData)
  const nearEmergency = evaluateNearEmergencyRisk(healthData)
  const highRisk = emergency.isEmergency || nearEmergency.isNearEmergency
  return {
    primary_clinical_concern: emergency.isEmergency
      ? "Critical Health Alert"
      : nearEmergency.isNearEmergency
        ? "High Risk - Immediate Attention Recommended"
        : "No Significant Concern",
    predicted_disease: emergency.isEmergency
      ? "Critical Health Alert"
      : nearEmergency.isNearEmergency
        ? "High Risk - Immediate Attention Recommended"
        : "No Significant Concern",
    confidence: emergency.isEmergency ? 0.9 : nearEmergency.isNearEmergency ? 0.75 : 0.5,
    confidence_percent: emergency.isEmergency ? 90 : nearEmergency.isNearEmergency ? 75 : 50,
    confidence_source: "safe_fallback",
    risk_level: highRisk ? "High" : "Low",
    clinical_risk: highRisk ? "High" : "Low",
    explanation: emergency.isEmergency
      ? `Critical health metrics require emergency care. Triggered by: ${emergency.triggers.join(", ")}.`
      : nearEmergency.isNearEmergency
        ? `Health metrics are close to emergency thresholds (${nearEmergency.findings.join(", ")}). Immediate clinical review is recommended.`
      : "Current findings do not indicate a significant clinical concern. Continue routine monitoring and seek care if symptoms worsen.",
    ai_explanation: emergency.isEmergency
      ? `Critical health metrics require emergency care. Triggered by: ${emergency.triggers.join(", ")}.`
      : nearEmergency.isNearEmergency
        ? `Health metrics are close to emergency thresholds (${nearEmergency.findings.join(", ")}). Immediate clinical review is recommended.`
      : "Current findings do not indicate a significant clinical concern. Continue routine monitoring and seek care if symptoms worsen.",
    precautions: emergency.isEmergency
      ? ["Seek emergency medical care immediately", "Do not self-medicate without physician guidance", "Monitor symptoms continuously"]
      : nearEmergency.isNearEmergency
        ? ["Arrange urgent same-day clinical review", "Monitor blood pressure and glucose closely", "Seek emergency care if symptoms worsen"]
      : ["Schedule a clinician review soon", "Track symptom and vital changes", "Seek urgent care if symptoms worsen"],
    diet: emergency.isEmergency
      ? ["Avoid high-sodium and high-sugar meals until reviewed", "Hydrate as medically appropriate", "Follow emergency care team instructions"]
      : ["Follow a balanced low-processed-food diet", "Limit excess sugar and sodium", "Maintain hydration"],
    uncertainty: {
      uncertainty_level: emergency.isEmergency ? "Low" : "High",
      reason: reason || "Gemini output unavailable or invalid",
    },
    metric_assessment: {
      priority: "metrics_first",
      emergency_override: emergency.isEmergency,
      emergency_triggers: emergency.triggers,
      near_emergency_risk: nearEmergency.isNearEmergency,
      near_emergency_findings: nearEmergency.findings,
    },
    analysis_mode: "metrics_first_clinical",
    metrics_used_count: 4,
    prediction_source: "gemini_primary_fallback",
    model_type: "gemini-primary",
    emergency_override: emergency.isEmergency,
    emergency_triggers: emergency.triggers,
  }
}

async function analyzePrimaryPredictionWithGemini(healthData) {
  try {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY is not configured")
    }

    const emergency = evaluateEmergencyOverride(healthData)
    const nearEmergency = evaluateNearEmergencyRisk(healthData)
    const symptomEscalation = evaluateSymptomEscalation(healthData?.symptoms)
    const moderateAbnormalities = evaluateModerateAbnormalities(healthData)
    const symptoms = Array.isArray(healthData?.symptoms) ? healthData.symptoms : []

    const prompt = `You are a clinical reasoning engine generating a medically accurate and logically consistent prediction.
Produce strict JSON only.
Rules:
1) Health metrics are PRIMARY evidence and must be weighted more than symptoms.
2) High-risk symptoms (chest pain, shortness of breath, neurological deficits, severe dizziness) are CRITICAL indicators and must escalate risk even with normal metrics.
3) Emergency override is mandatory:
   - Blood pressure >180 systolic OR >120 diastolic
   - Glucose >300 mg/dL
   - Cholesterol >=300 mg/dL
   If any threshold is met, set concern to "Critical Health Alert", risk_level "High", confidence >=0.85. This overrides all other interpretations.
4) If values are near emergency thresholds, set risk_level "High" with immediate attention recommended, but DO NOT label as full emergency unless threshold is clearly exceeded.
5) If multiple moderate abnormalities across BP, glucose, and cholesterol are present together, risk_level must be at least "Medium" and may be "High".
6) If data is normal/insufficient, do not force disease; use safe conclusions such as "Clinically Stable" or "No Significant Concern".
7) Avoid hallucinations and unrelated diseases. Prefer condition categories over specific diagnoses unless strongly supported.
8) Ensure strict consistency between risk_level, confidence, and explanation. Keep concise and professional like a clinical system report.

Patient input:
- Age: ${healthData.age}
- Gender: ${healthData.gender}
- Weight: ${healthData.weight}
- Blood Pressure: ${healthData.bloodPressureSystolic ?? "unknown"}/${healthData.bloodPressureDiastolic ?? "unknown"}
- Glucose: ${healthData.glucose ?? "unknown"}
- Cholesterol: ${healthData.cholesterol ?? "unknown"}
- Symptoms: ${symptoms.length ? symptoms.join(", ") : "none"}

Return JSON with exactly these keys:
{
  "primary_clinical_concern": "string",
  "confidence": 0.0,
  "risk_level": "Low|Medium|High",
  "explanation": "string",
  "precautions": ["string"],
  "diet": ["string"],
  "uncertainty_reason": "string or empty",
  "metric_priority_notes": ["string"],
  "emergency_override": true,
  "emergency_triggers": ["string"]
}`

    const text = await generateWithFallback(prompt, { timeoutMs: 20000 })
    const parsed = parseJSONObject(text)
    const confidence = clamp01(parsed.confidence)
    const safeConfidence = confidence === null ? 0.5 : confidence
    const concernRaw = String(parsed.primary_clinical_concern || "").trim()
    const concern = concernRaw || "Uncertain Clinical Picture"
    const safeRisk = normalizeRiskLevel(parsed.risk_level)
    const uncertaintyReason = String(parsed.uncertainty_reason || "").trim()
    const metricPriorityNotes = sanitizeStringArray(parsed.metric_priority_notes, 5)
    const precautions = sanitizeStringArray(parsed.precautions, 6)
    const diet = sanitizeStringArray(parsed.diet, 6)
    const parsedEmergency = Boolean(parsed.emergency_override)
    const parsedEmergencyTriggers = sanitizeStringArray(parsed.emergency_triggers, 5)

    const forcedEmergency = emergency.isEmergency
    const emergencyOverride = forcedEmergency || parsedEmergency
    const emergencyTriggers = forcedEmergency
      ? emergency.triggers
      : (parsedEmergencyTriggers.length ? parsedEmergencyTriggers : [])

    const lowConfidence = safeConfidence < 0.55
    const symptomRiskEscalated = symptomEscalation.hasCriticalSymptoms && !emergencyOverride
    const nearEmergencyEscalated = nearEmergency.isNearEmergency && !emergencyOverride
    const moderateRiskEscalated = moderateAbnormalities.hasMultipleModerates && !emergencyOverride && !nearEmergencyEscalated
    const shouldReturnUncertain = lowConfidence && !emergencyOverride && !symptomRiskEscalated
    const primaryConcern = emergencyOverride
      ? "Critical Health Alert"
      : nearEmergencyEscalated
        ? "High Risk - Immediate Attention Recommended"
      : symptomRiskEscalated
        ? "High Risk Symptom Pattern"
        : moderateRiskEscalated
          ? "Moderate Health Risk Pattern"
      : shouldReturnUncertain
        ? "Mild Non-Specific Symptoms"
        : concern

    let finalRisk = emergencyOverride ? "High" : normalizeRiskLevel(safeRisk)
    if (nearEmergencyEscalated) finalRisk = "High"
    if (symptomRiskEscalated) finalRisk = "High"
    if (moderateRiskEscalated && finalRisk === "Low") finalRisk = "Medium"
    const finalConfidence = emergencyOverride
      ? Math.max(safeConfidence, 0.85)
      : nearEmergencyEscalated
        ? Math.max(safeConfidence, 0.72)
      : symptomRiskEscalated
        ? Math.max(safeConfidence, 0.7)
        : safeConfidence
    const normalizedConcern = (String(primaryConcern || "").trim() || "No Significant Concern")
      .replace("Uncertain Clinical Picture", "No Significant Concern")

    return {
      primary_clinical_concern: normalizedConcern,
      predicted_disease: normalizedConcern,
      confidence: finalConfidence,
      confidence_percent: Number((finalConfidence * 100).toFixed(2)),
      confidence_source: "gemini_primary",
      risk_level: finalRisk,
      clinical_risk: finalRisk,
      explanation: String(parsed.explanation || "").trim() || "Clinical analysis generated from provided health metrics and symptoms.",
      ai_explanation: String(parsed.explanation || "").trim() || "Clinical analysis generated from provided health metrics and symptoms.",
      precautions,
      diet,
      uncertainty: {
        uncertainty_level: shouldReturnUncertain ? "Medium" : (finalConfidence < 0.7 ? "Medium" : "Low"),
        reason: shouldReturnUncertain ? (uncertaintyReason || "Evidence is insufficient for disease-specific classification.") : "",
      },
      metric_assessment: {
        priority: "metrics_first",
        metric_priority_notes: metricPriorityNotes,
        emergency_override: emergencyOverride,
        emergency_triggers: emergencyTriggers,
        near_emergency_risk: nearEmergencyEscalated,
        near_emergency_findings: nearEmergency.findings,
        critical_symptoms_present: symptomEscalation.hasCriticalSymptoms,
        critical_symptoms: symptomEscalation.criticalSymptoms,
        moderate_abnormalities_count: moderateAbnormalities.moderateCount,
        moderate_abnormality_findings: moderateAbnormalities.findings,
      },
      analysis_mode: "metrics_first_clinical",
      metrics_used_count: 4,
      prediction_source: "gemini_primary",
      model_type: "gemini-primary",
      emergency_override: emergencyOverride,
      emergency_triggers: emergencyTriggers,
    }
  } catch (error) {
    console.error("[Gemini] Primary analysis failed:", error?.message || error)
    return buildSafeFallback(healthData, error?.message || "Primary analysis failed")
  }
}

module.exports = { analyzePrimaryPredictionWithGemini, evaluateEmergencyOverride }
