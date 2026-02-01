const { GoogleGenerativeAI } = require("@google/generative-ai")

function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini API timeout")), timeoutMs)),
  ])
}

const apiKey = process.env.GEMINI_API_KEY
const preferredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash"
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

  const candidates = ["gemini-2.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash"]

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

async function analyzeSymptomsWithGemini(healthData) {
  try {
    if (!genAI) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = await resolveModel();
    
    // Normalize gender for prompt
    const genderStr = healthData.gender === 1 || healthData.gender === 'M' ? 'Male' : 
                     healthData.gender === 0 || healthData.gender === 'F' ? 'Female' : 'Other';

    const prompt = `You are a highly experienced medical diagnostic AI. 
Analyze the following patient data and symptoms to predict the most likely disease or condition.

Patient Profile:
- Age: ${healthData.age}
- Gender: ${genderStr}
- Weight: ${healthData.weight} kg
- Vitals: BP ${healthData.bloodPressureSystolic}/${healthData.bloodPressureDiastolic}, Glucose ${healthData.glucose}, Cholesterol ${healthData.cholesterol}
- Reported Symptoms: ${Array.isArray(healthData.symptoms) ? healthData.symptoms.join(', ') : healthData.symptoms}

Your task is to:
1. Predict the most likely disease/condition based on the symptoms and vitals.
2. Assign a confidence score (0.0-1.0) and risk level (Low/Medium/High).
3. Provide a brief medical explanation, specific precautions, and dietary recommendations.

IMPORTANT: You are a fallback system for an ML model. You must be accurate but safe. If symptoms are vague, suggest "Viral Infection" or "General Fatigue" with lower confidence. If critical, suggest "Urgent Medical Attention Needed".

Response Format (JSON ONLY):
{
  "predicted_disease": "Name of Disease",
  "confidence": 0.95,
  "risk_level": "High",
  "explanation": "Medical explanation...",
  "precautions": ["precaution 1", "precaution 2", ...],
  "diet": ["diet recommendation 1", ...]
}`;

    const result = await withTimeout(model.generateContent(prompt), 15000);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse JSON from Gemini analysis");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Normalize structure to match ML service
    return {
      predicted_disease: parsed.predicted_disease || "Unknown Condition",
      confidence: parsed.confidence || 0.5,
      confidence_percent: (parsed.confidence || 0.5) * 100,
      risk_level: parsed.risk_level || "Medium",
      precautions: Array.isArray(parsed.precautions) ? parsed.precautions : [],
      diet: Array.isArray(parsed.diet) ? parsed.diet : [],
      ai_explanation: parsed.explanation || "",
      used_symptoms_path: false,
      matched_symptoms: Array.isArray(healthData.symptoms) ? healthData.symptoms.length : 0,
      model_type: "gemini-fallback"
    };

  } catch (error) {
    console.error("[Gemini] Fallback analysis failed:", error.message);
    // Return a safe default if even Gemini fails
    return {
      predicted_disease: "Medical Consultation Required",
      confidence: 0,
      confidence_percent: 0,
      risk_level: "Unknown",
      precautions: ["Consult a doctor immediately", "Monitor symptoms"],
      diet: ["Maintain balanced diet"],
      ai_explanation: "Automated analysis failed. Please consult a healthcare professional directly.",
      used_symptoms_path: false,
      matched_symptoms: 0,
      model_type: "failure-fallback"
    };
  }
}

module.exports = { callGeminiAPI, analyzeSymptomsWithGemini }
