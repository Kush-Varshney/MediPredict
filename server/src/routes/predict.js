const express = require("express")
const axios = require("axios")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const Prediction = require("../models/Prediction")
const { callGeminiAPI } = require("../services/gemini")
const mongoose = require("mongoose")
const router = express.Router()

// Validation middleware
const validatePredictionInput = [
  body("age").isInt({ min: 0, max: 150 }).withMessage("Age must be between 0 and 150"),
  body("gender").isIn(["M", "F", "Other"]).withMessage("Invalid gender"),
  body("weight").isFloat({ min: 20, max: 300 }).withMessage("Weight must be between 20 and 300"),
  body("bloodPressureSystolic").isInt({ min: 50, max: 250 }).withMessage("Invalid systolic BP"),
  body("bloodPressureDiastolic").isInt({ min: 30, max: 150 }).withMessage("Invalid diastolic BP"),
  body("glucose").isFloat({ min: 40, max: 400 }).withMessage("Invalid glucose level"),
  body("cholesterol").isFloat({ min: 50, max: 500 }).withMessage("Invalid cholesterol level"),
]

// Make prediction
router.post("/", auth, validatePredictionInput, async (req, res) => {
  try {
    // Fail fast if DB is not connected to avoid Mongoose buffering timeouts
    if (mongoose.connection.readyState !== 1) {
      console.error("[Predict] Database not connected; failing fast to avoid buffering timeouts")
      return res.status(503).json({
        message: "Database not connected",
        error: "DB_UNAVAILABLE",
        details: "MongoDB is not connected; please ensure MONGO_URI points to a running instance",
        dbConnected: false,
      })
    }

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
      timeout: 30000,
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


    // Call ML service
    let mlResponse
    try {
      mlResponse = await http.post(`/predict`, {
        age,
        gender: gender === "M" ? 1 : 0,
        weight,
        blood_pressure_systolic: bloodPressureSystolic,
        blood_pressure_diastolic: bloodPressureDiastolic,
        glucose,
        cholesterol,
        // Pass through symptoms list (strings); ML service maps to vocabulary if available
        symptoms: normalizedSymptoms,
      })
    } catch (mlError) {
      const status = mlError.response?.status || 503
      const detail = mlError.response?.data || { message: "ML service unavailable" }
      console.error("[Predict] ML Service error:")
      console.error("  Status:", status)
      console.error("  Message:", mlError.message)
      console.error("  Response data:", detail)
      console.error("  ML Service URL:", process.env.ML_SERVICE_URL)
      // Attempt Gemini fallback to still provide precautions/diet guidance
      let geminiFallback
      try {
        geminiFallback = await callGeminiAPI("General Health", {
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
        console.error("[Predict] Gemini fallback error:", gemError?.message)
      }

      return res.status(status).json({
        message: "ML service error",
        error: "ML_SERVICE_FAILED",
        details: detail,
        mlServiceUrl: process.env.ML_SERVICE_URL,
        hint: "Ensure Flask ML service is running on port 5001",
        // Provide Gemini guidance when available so UI can render recommendations
        precautions: geminiFallback?.precautions || [],
        diet: geminiFallback?.diet || [],
        ai_explanation: geminiFallback?.explanation || "AI insights temporarily unavailable.",
        // Include input metrics even in error case for Health Metrics Overview
        age: age,
        gender: gender,
        weight: weight,
        bloodPressureSystolic: bloodPressureSystolic,
        bloodPressureDiastolic: bloodPressureDiastolic,
        glucose: glucose,
        cholesterol: cholesterol,
        symptoms: normalizedSymptoms,
      })
    }

    const ml = mlResponse.data
    const confidenceNum = Number.isFinite(ml.confidence) ? Number(ml.confidence) : 0
    const confidencePct = Number.isFinite(ml.confidence_percent)
      ? Number(ml.confidence_percent)
      : Math.round(confidenceNum * 10000) / 100

    // Call Gemini API for insights (robust to SDK/model errors)
    let geminiResponse
    try {
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
      console.error("[Predict] Gemini API error:", gemError?.message)
    }

    // Save prediction (prefer Gemini's structured guidance when available)
    const prediction = new Prediction({
      userId: req.user.userId,
      age,
      gender,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      glucose,
      cholesterol,
      symptoms: normalizedSymptoms,
      predictedDisease: ml.predicted_disease || ml.predictedDisease || "Unknown",
      confidence: Number.isFinite(ml.confidence) ? Number(ml.confidence) : confidenceNum,
      confidencePercent: Number.isFinite(confidencePct) ? Number(confidencePct) : 0,
      riskLevel: ml.risk_level || ml.riskLevel || "Unknown",
      precautions: Array.isArray(geminiResponse?.precautions)
        ? geminiResponse.precautions
        : Array.isArray(ml.precautions)
        ? ml.precautions
        : [],
      diet: Array.isArray(geminiResponse?.diet)
        ? geminiResponse.diet
        : Array.isArray(ml.diet)
        ? ml.diet
        : [],
      aiExplanation: geminiResponse?.explanation || ml.ai_explanation || "",
      usedSymptomsPath: !!ml.used_symptoms_path,
      matchedSymptoms: Number.isFinite(ml.matched_symptoms) ? Number(ml.matched_symptoms) : 0,
      modelType: ml.model_type || "",
    })

    await prediction.save()

    // Prepare response with all metrics
    const responseData = {
      predicted_disease: prediction.predictedDisease,
      confidence: prediction.confidence,
      confidence_percent: prediction.confidencePercent,
      risk_level: prediction.riskLevel,
      precautions: prediction.precautions,
      diet: prediction.diet,
      ai_explanation: prediction.aiExplanation,
      used_symptoms_path: prediction.usedSymptomsPath,
      matched_symptoms: prediction.matchedSymptoms,
      model_type: prediction.modelType,
      // Include input metrics for Health Metrics Overview - CRITICAL for UI
      age: age,
      gender: gender,
      weight: weight,
      bloodPressureSystolic: bloodPressureSystolic,
      bloodPressureDiastolic: bloodPressureDiastolic,
      glucose: glucose,
      cholesterol: cholesterol,
      symptoms: normalizedSymptoms,
      // Include timestamp for trends
      createdAt: prediction.createdAt?.toISOString() || new Date().toISOString(),
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
    const { limit = 10, skip = 0 } = req.query
    const predictions = await Prediction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(Number.parseInt(skip))
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
      total,
      limit: Number.parseInt(limit),
      skip: Number.parseInt(skip),
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
