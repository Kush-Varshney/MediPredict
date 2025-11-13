const { GoogleGenerativeAI } = require("@google/generative-ai")

function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini API timeout")), timeoutMs)),
  ])
}

const apiKey = process.env.GEMINI_API_KEY
const preferredModel = process.env.GEMINI_MODEL || "gemini-2.0-flash"
let genAI = null
if (apiKey && apiKey.trim()) {
  genAI = new GoogleGenerativeAI(apiKey)
}

// Resolve a working model once per process
let resolvedModel = null
async function resolveModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY is not configured")
  if (resolvedModel) return resolvedModel

  if (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) {
    const name = process.env.GEMINI_MODEL.trim()
    try {
      const model = genAI.getGenerativeModel({ model: name })
      const probe = await withTimeout(model.generateContent("OK"), 5000)
      if (probe.response?.text()) {
        resolvedModel = model
        return resolvedModel
      }
    } catch (err) {
      console.warn(`Model ${name} not available:`, err.message)
    }
  }

  const candidates = ["gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash"]

  let lastErr
  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: name })
      const probe = await withTimeout(model.generateContent("OK"), 5000)
      if (probe.response?.text()) {
        resolvedModel = model
        return resolvedModel
      }
    } catch (err) {
      lastErr = err
      continue
    }
  }
  throw lastErr || new Error("No compatible Gemini model found")
}

async function callGeminiAPI(disease, healthData) {
  try {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY is not configured - set it in environment variables")
    }

    const model = await resolveModel()

    const prompt = `You are a medical AI assistant. Based on the disease "${disease}" and the following health data:
- Age: ${healthData.age}
- Gender: ${healthData.gender}
- Weight: ${healthData.weight} kg
- Blood Pressure: ${healthData.bloodPressureSystolic}/${healthData.bloodPressureDiastolic} mmHg
- Glucose: ${healthData.glucose} mg/dL
- Cholesterol: ${healthData.cholesterol} mg/dL

Please provide:
1. A brief explanation of the disease (2-3 sentences)
2. 3-5 precautions to take
3. 3-5 dietary recommendations

Format your response as a JSON object with keys: "explanation", "precautions" (array of strings), "diet" (array of strings).
Only return the JSON object, no additional text.`

    const result = await withTimeout(model.generateContent(prompt), 15000)
    const response = await result.response
    const text = response.text()

    if (!text || text.trim().length === 0) {
      throw new Error("Empty response from Gemini")
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn(`[Gemini] Could not parse JSON. Response was: ${text.substring(0, 200)}`)
      throw new Error("Could not parse JSON from Gemini response")
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.warn(`[Gemini] JSON parse failed:`, parseErr.message)
      throw new Error("Invalid JSON from Gemini response")
    }

    if (
      !parsedResponse.explanation ||
      !Array.isArray(parsedResponse.precautions) ||
      !Array.isArray(parsedResponse.diet)
    ) {
      throw new Error("Gemini response missing required fields")
    }

    return {
      explanation: parsedResponse.explanation,
      precautions: parsedResponse.precautions.filter((p) => typeof p === "string" && p.trim().length > 0),
      diet: parsedResponse.diet.filter((d) => typeof d === "string" && d.trim().length > 0),
    }
  } catch (error) {
    console.error(`[Gemini] API error: ${error?.message || error}`)
    console.error("[Gemini] Stack trace:", error?.stack)

    return {
      explanation:
        "AI insights are temporarily unavailable. Based on your health profile, follow general best practices and consult a healthcare professional.",
      precautions: [
        "Consult a licensed healthcare professional for proper diagnosis",
        "Monitor symptoms and seek urgent care if they worsen",
        "Follow medical recommendations from your healthcare provider",
        "Maintain a healthy lifestyle with regular exercise",
        "Keep medical records and track health changes",
      ],
      diet: [
        "Maintain a balanced diet with fruits, vegetables, and whole grains",
        "Limit processed foods, added sugars, and excessive salt",
        "Stay hydrated unless medically restricted",
        "Eat lean proteins and healthy fats",
        "Avoid alcohol and smoking unless cleared by your doctor",
      ],
    }
  }
}

module.exports = { callGeminiAPI }
