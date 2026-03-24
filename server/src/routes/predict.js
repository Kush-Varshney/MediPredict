const express = require("express")
const axios = require("axios")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const Prediction = require("../models/Prediction")
const { callGeminiAPI, analyzeSymptomsWithGemini } = require("../services/gemini")
const mongoose = require("mongoose")
const { HEALTH_METRIC_RANGES } = require("../utils/validationConstants")
const CircuitBreaker = require("../utils/circuitBreaker")
const logger = require("../utils/logger")

const router = express.Router()

// Initialize Circuit Breaker for ML Service
const mlCircuitBreaker = new CircuitBreaker("MLService", {
  failureThreshold: 2,
  requestTimeout: 5000,
  resetTimeout: 30000,
})

// Validation middleware
const validatePredictionInput = [
  body("age")
    .isInt({ min: HEALTH_METRIC_RANGES.age.min, max: HEALTH_METRIC_RANGES.age.max })
    .withMessage(`Age must be between ${HEALTH_METRIC_RANGES.age.min} and ${HEALTH_METRIC_RANGES.age.max}`),
  body("gender").isIn(["M", "F", "Other"]).withMessage("Invalid gender"),
  body("weight")
    .isFloat({ min: HEALTH_METRIC_RANGES.weight.min, max: HEALTH_METRIC_RANGES.weight.max })
    .withMessage(`Weight must be between ${HEALTH_METRIC_RANGES.weight.min} and ${HEALTH_METRIC_RANGES.weight.max}`),
  body("bloodPressureSystolic")
    .optional({ nullable: true })
    .isInt({ min: HEALTH_METRIC_RANGES.bloodPressureSystolic.min, max: HEALTH_METRIC_RANGES.bloodPressureSystolic.max })
    .withMessage(`Systolic BP must be between ${HEALTH_METRIC_RANGES.bloodPressureSystolic.min} and ${HEALTH_METRIC_RANGES.bloodPressureSystolic.max}`),
  body("bloodPressureDiastolic")
    .optional({ nullable: true })
    .isInt({ min: HEALTH_METRIC_RANGES.bloodPressureDiastolic.min, max: HEALTH_METRIC_RANGES.bloodPressureDiastolic.max })
    .withMessage(`Diastolic BP must be between ${HEALTH_METRIC_RANGES.bloodPressureDiastolic.min} and ${HEALTH_METRIC_RANGES.bloodPressureDiastolic.max}`),
  body("glucose")
    .optional({ nullable: true })
    .isFloat({ min: HEALTH_METRIC_RANGES.glucose.min, max: HEALTH_METRIC_RANGES.glucose.max })
    .withMessage(`Glucose must be between ${HEALTH_METRIC_RANGES.glucose.min} and ${HEALTH_METRIC_RANGES.glucose.max}`),
  body("cholesterol")
    .optional({ nullable: true })
    .isFloat({ min: HEALTH_METRIC_RANGES.cholesterol.min, max: HEALTH_METRIC_RANGES.cholesterol.max })
    .withMessage(`Cholesterol must be between ${HEALTH_METRIC_RANGES.cholesterol.min} and ${HEALTH_METRIC_RANGES.cholesterol.max}`),
  body().custom((value) => {
    const hasSys = value.bloodPressureSystolic !== null && value.bloodPressureSystolic !== undefined
    const hasDia = value.bloodPressureDiastolic !== null && value.bloodPressureDiastolic !== undefined
    if (hasSys !== hasDia) {
      throw new Error("Provide both systolic and diastolic blood pressure values, or leave both unknown")
    }
    return true
  }),
]

// Make prediction
router.post("/", auth, validatePredictionInput, async (req, res) => {
  try {
    if (!process.env.ML_SERVICE_URL) {
      console.error("[Predict] FATAL: ML_SERVICE_URL not configured")
      return res.status(500).json({
        message: "ML service URL is not configured",
        error: "CONFIG_ERROR",
        details: "Set ML_SERVICE_URL environment variable pointing to Flask service (e.g., http://127.0.0.1:5001)",
      })
    }


    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.warn("[Predict] Validation failed:", errors.array())
      return res.status(400).json({
        message: "Invalid input data",
        errors: errors.array(),
      })
    }

    const http = axios.create({
      baseURL: process.env.ML_SERVICE_URL,
      timeout: 5000, // Client side timeout matching circuit breaker
    })

    const { age, gender, weight, bloodPressureSystolic, bloodPressureDiastolic, glucose, cholesterol, symptoms } =
      req.body
    
    // Normalize symptoms input: support comma-separated string or array of strings
    let normalizedSymptoms = []
    if (Array.isArray(symptoms)) {
      normalizedSymptoms = symptoms
        .map((s) => (s == null ? "" : String(s)))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0)
    } else if (typeof symptoms === "string") {
      normalizedSymptoms = symptoms
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0)
    }

    const payload = {
      age,
      gender: gender === "M" ? 1 : gender === "F" ? 0 : 0.5,
      weight,
      blood_pressure_systolic: bloodPressureSystolic ?? null,
      blood_pressure_diastolic: bloodPressureDiastolic ?? null,
      glucose: glucose ?? null,
      cholesterol: cholesterol ?? null,
      symptoms: normalizedSymptoms,
    }

    // Execute prediction with Circuit Breaker and Fallback
    let predictionData
    let isFallback = false

    try {
      const mlResponse = await mlCircuitBreaker.execute(() => http.post(`/predict`, payload))
      predictionData = mlResponse.data
    } catch (mlError) {
      logger.warn("[Predict] ML Service unavailable, triggering fallback", {
        error: mlError.message,
        circuitState: mlCircuitBreaker.state
      })
      
      isFallback = true
      
      // Full Fallback to Gemini Analysis
      const healthData = {
        age, 
        gender, 
        weight, 
        bloodPressureSystolic, 
        bloodPressureDiastolic, 
        glucose, 
        cholesterol, 
        symptoms: normalizedSymptoms
      }
      
      predictionData = await analyzeSymptomsWithGemini(healthData)
    }

    const ml = predictionData
    const confidenceNum = Number.isFinite(Number(ml.confidence)) ? Number(ml.confidence) : null
    const confidencePct = Number.isFinite(ml.confidence_percent)
      ? Number(ml.confidence_percent)
      : confidenceNum === null
        ? null
        : Math.round(confidenceNum * 10000) / 100

    // If we didn't use fallback, we might still want Gemini enrichment if the ML model 
    // didn't return detailed text fields (precautions/diet/explanation)
    let geminiResponse = null
    if (!isFallback) {
      try {
        // Only call if missing data or if we want to ensure high quality text
        // For now, we always call it to ensure consistency with the original logic
        // unless the ML model is very rich (which the current python one isn't fully)
        geminiResponse = await callGeminiAPI(ml.predicted_disease, {
          age,
          gender,
          weight,
          bloodPressureSystolic,
          bloodPressureDiastolic,
          glucose,
          cholesterol,
          symptoms: normalizedSymptoms,
        })
      } catch (gemError) {
        logger.error("[Predict] Gemini API enrichment error:", { error: gemError?.message })
      }
    }

    // Merge data: Fallback data already has these fields. ML data might not.
    // Gemini enrichment (geminiResponse) takes precedence over ML data for text fields.
    const finalPrecautions = isFallback 
      ? ml.precautions 
      : (Array.isArray(geminiResponse?.precautions) ? geminiResponse.precautions : (ml.precautions || []))

    const finalDiet = isFallback 
      ? ml.diet 
      : (Array.isArray(geminiResponse?.diet) ? geminiResponse.diet : (ml.diet || []))

    const finalExplanation = isFallback 
      ? ml.ai_explanation 
      : (geminiResponse?.explanation || ml.ai_explanation || "")

    // Save prediction
    let diseaseName = ml.predicted_disease || ml.predictedDisease || "Unknown"
    
    // Defensive check: Ensure disease name is not a UI component title (addressing reported issue)
    if (diseaseName === "Health Insights & Recommendations") {
      logger.warn("[Predict] Invalid disease name detected (UI title contamination), defaulting to Unknown", { original: diseaseName })
      diseaseName = "Unknown"
    }

    let prediction = null
    let persisted = false
    if (mongoose.connection.readyState === 1) {
      prediction = new Prediction({
        userId: req.user.userId,
        age,
        gender,
        weight,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        glucose,
        cholesterol,
        symptoms: normalizedSymptoms,
        predictedDisease: diseaseName,
        confidence: confidenceNum,
        confidencePercent: confidencePct,
        riskLevel: ml.risk_level || ml.riskLevel || "Unknown",
        precautions: finalPrecautions,
        diet: finalDiet,
        aiExplanation: finalExplanation,
        usedSymptomsPath: !!ml.used_symptoms_path,
        matchedSymptoms: Number.isFinite(ml.matched_symptoms) ? Number(ml.matched_symptoms) : 0,
        modelType: ml.model_type || (isFallback ? "gemini-fallback" : "ml-service"),
      })
      await prediction.save()
      persisted = true
    } else {
      logger.warn("[Predict] DB not connected; returning non-persisted prediction")
    }

    // Prepare response with all metrics
    const responseData = {
      predicted_disease: persisted ? prediction.predictedDisease : diseaseName,
      confidence: confidenceNum,
      confidence_percent: confidencePct,
      confidence_source: ml.confidence_source || (isFallback ? "llm_estimate" : "model_proba"),
      risk_level: persisted ? prediction.riskLevel : (ml.risk_level || ml.riskLevel || "Unknown"),
      clinical_risk: ml.clinical_risk || (ml.risk_level || ml.riskLevel || "Unknown"),
      analysis_mode: ml.analysis_mode || (ml.used_symptoms_path ? "symptom_only" : "metrics_only"),
      metrics_used_count: Number.isFinite(ml.metrics_used_count) ? Number(ml.metrics_used_count) : 0,
      precautions: persisted ? prediction.precautions : finalPrecautions,
      diet: persisted ? prediction.diet : finalDiet,
      ai_explanation: persisted ? prediction.aiExplanation : finalExplanation,
      used_symptoms_path: persisted ? prediction.usedSymptomsPath : !!ml.used_symptoms_path,
      matched_symptoms: persisted
        ? prediction.matchedSymptoms
        : (Number.isFinite(ml.matched_symptoms) ? Number(ml.matched_symptoms) : 0),
      symptom_evidence: ml.symptom_evidence || null,
      metric_assessment: ml.metric_assessment || null,
      uncertainty: ml.uncertainty || null,
      model_type: persisted ? prediction.modelType : (ml.model_type || (isFallback ? "gemini-fallback" : "ml-service")),
      prediction_source: isFallback ? "llm_fallback" : "ml_service",
      top_k: Array.isArray(ml.top_k) ? ml.top_k : [],
      persisted,
      input_snapshot: {
        age,
        gender,
        weight,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        glucose,
        cholesterol,
        symptoms: normalizedSymptoms,
      },
      // Legacy flattened fields for backward compatibility
      age,
      gender,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      glucose,
      cholesterol,
      symptoms: normalizedSymptoms,
      createdAt: persisted ? (prediction.createdAt?.toISOString() || new Date().toISOString()) : new Date().toISOString(),
    }


    res.json(responseData)
  } catch (error) {
    console.error("[Predict] Unexpected error:")
    console.error("  Error message:", error.message)
    console.error("  Error name:", error.name)
    console.error("  Error stack:", error.stack)
    console.error("  Environment ML_SERVICE_URL:", process.env.ML_SERVICE_URL)

    res.status(500).json({
      message: "Internal server error",
      error: "UNEXPECTED_ERROR",
      details: error.message,
      hint: "Check server logs for more information",
    })
  }
})

// Get prediction history
router.get("/history", auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean() // Return plain JavaScript objects instead of Mongoose documents
    const total = await Prediction.countDocuments({ userId: req.user.userId })

    // Ensure consistent field naming for frontend
    const serializedPredictions = predictions.map((pred) => ({
      _id: pred._id?.toString(),
      id: pred._id?.toString(),
      age: pred.age,
      gender: pred.gender,
      weight: pred.weight,
      bloodPressureSystolic: pred.bloodPressureSystolic,
      bloodPressureDiastolic: pred.bloodPressureDiastolic,
      glucose: pred.glucose,
      cholesterol: pred.cholesterol,
      symptoms: pred.symptoms || [],
      predictedDisease: pred.predictedDisease,
      predicted_disease: pred.predictedDisease, // Support both naming conventions
      confidence: pred.confidence,
      confidencePercent: pred.confidencePercent,
      confidence_percent: pred.confidencePercent, // Support both naming conventions
      riskLevel: pred.riskLevel,
      risk_level: pred.riskLevel, // Support both naming conventions
      precautions: pred.precautions || [],
      diet: pred.diet || [],
      aiExplanation: pred.aiExplanation,
      ai_explanation: pred.aiExplanation, // Support both naming conventions
      createdAt: pred.createdAt?.toISOString() || new Date(pred.createdAt).toISOString(),
    }))

    res.json({
      predictions: serializedPredictions,
      total
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get single prediction
router.get("/:id", auth, async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id).lean()

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" })
    }

    // Check authorization
    if (prediction.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" })
    }

    // Serialize with consistent field naming
    res.json({
      _id: prediction._id?.toString(),
      id: prediction._id?.toString(),
      age: prediction.age,
      gender: prediction.gender,
      weight: prediction.weight,
      bloodPressureSystolic: prediction.bloodPressureSystolic,
      bloodPressureDiastolic: prediction.bloodPressureDiastolic,
      glucose: prediction.glucose,
      cholesterol: prediction.cholesterol,
      symptoms: prediction.symptoms || [],
      predictedDisease: prediction.predictedDisease,
      predicted_disease: prediction.predictedDisease,
      confidence: prediction.confidence,
      confidencePercent: prediction.confidencePercent,
      confidence_percent: prediction.confidencePercent,
      riskLevel: prediction.riskLevel,
      risk_level: prediction.riskLevel,
      precautions: prediction.precautions || [],
      diet: prediction.diet || [],
      aiExplanation: prediction.aiExplanation,
      ai_explanation: prediction.aiExplanation,
      createdAt: prediction.createdAt?.toISOString() || new Date(prediction.createdAt).toISOString(),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Delete prediction
router.delete("/:id", auth, async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id)

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" })
    }

    // Check authorization
    if (prediction.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" })
    }

    await Prediction.findByIdAndDelete(req.params.id)
    res.json({ message: "Prediction deleted" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
