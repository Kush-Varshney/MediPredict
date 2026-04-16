const express = require("express")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const Prediction = require("../models/Prediction")
const { analyzePrimaryPredictionWithGemini } = require("../services/gemini")
const mongoose = require("mongoose")
const { HEALTH_METRIC_RANGES } = require("../utils/validationConstants")
const logger = require("../utils/logger")

const router = express.Router()

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
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.warn("[Predict] Validation failed:", errors.array())
      return res.status(400).json({
        message: "Invalid input data",
        errors: errors.array(),
      })
    }

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

    const healthData = {
      age,
      gender,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      glucose,
      cholesterol,
      symptoms: normalizedSymptoms,
    }

    const ai = await analyzePrimaryPredictionWithGemini(healthData)
    const confidenceNum = Number.isFinite(Number(ai.confidence)) ? Number(ai.confidence) : null
    const confidencePct = Number.isFinite(Number(ai.confidence_percent))
      ? Number(ai.confidence_percent)
      : confidenceNum === null
        ? null
        : Number((confidenceNum * 100).toFixed(2))

    // Save prediction
    let primaryConcern = ai.primary_clinical_concern || "Uncertain Clinical Picture"
    
    // Defensive check: Ensure disease name is not a UI component title (addressing reported issue)
    if (primaryConcern === "Health Insights & Recommendations") {
      logger.warn("[Predict] Invalid disease name detected (UI title contamination), defaulting to Unknown", { original: primaryConcern })
      primaryConcern = "Unknown"
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
        predictedDisease: primaryConcern,
        confidence: confidenceNum,
        confidencePercent: confidencePct,
        riskLevel: ai.risk_level || "Unknown",
        precautions: Array.isArray(ai.precautions) ? ai.precautions : [],
        dietRecommendations: Array.isArray(ai.diet) ? ai.diet : [],
        explanation: ai.explanation || "",
        healthMetrics: {
          bloodPressureSystolic: bloodPressureSystolic ?? null,
          bloodPressureDiastolic: bloodPressureDiastolic ?? null,
          glucose: glucose ?? null,
          cholesterol: cholesterol ?? null,
          emergencyOverride: !!ai.emergency_override,
          emergencyTriggers: Array.isArray(ai.emergency_triggers) ? ai.emergency_triggers : [],
        },
        usedSymptomsPath: false,
        matchedSymptoms: 0,
        modelType: "unified-clinical-model",
      })
      await prediction.save()
      persisted = true
    } else {
      logger.warn("[Predict] DB not connected; returning non-persisted prediction")
    }

    // Prepare response with all metrics
    const responseData = {
      primary_concern: persisted ? prediction.predictedDisease : primaryConcern,
      confidence: confidenceNum,
      confidence_percent: confidencePct,
      risk_level: persisted ? prediction.riskLevel : (ai.risk_level || "Unknown"),
      precautions: persisted ? prediction.precautions : (Array.isArray(ai.precautions) ? ai.precautions : []),
      diet_recommendations: persisted ? (prediction.dietRecommendations || []) : (Array.isArray(ai.diet) ? ai.diet : []),
      explanation: persisted ? (prediction.explanation || "") : (ai.explanation || ""),
      health_metrics: persisted
        ? (prediction.healthMetrics || {})
        : {
            bloodPressureSystolic: bloodPressureSystolic ?? null,
            bloodPressureDiastolic: bloodPressureDiastolic ?? null,
            glucose: glucose ?? null,
            cholesterol: cholesterol ?? null,
            emergencyOverride: !!ai.emergency_override,
            emergencyTriggers: Array.isArray(ai.emergency_triggers) ? ai.emergency_triggers : [],
          },
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
      primary_concern: pred.predictedDisease,
      confidence: pred.confidence,
      confidence_percent: pred.confidencePercent,
      risk_level: pred.riskLevel,
      precautions: pred.precautions || [],
      diet_recommendations: pred.dietRecommendations || [],
      explanation: pred.explanation || "",
      health_metrics: pred.healthMetrics || {},
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
      primary_concern: prediction.predictedDisease,
      confidence: prediction.confidence,
      confidence_percent: prediction.confidencePercent,
      risk_level: prediction.riskLevel,
      precautions: prediction.precautions || [],
      diet_recommendations: prediction.dietRecommendations || [],
      explanation: prediction.explanation || "",
      health_metrics: prediction.healthMetrics || {},
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
