const express = require("express")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const User = require("../models/User")
const router = express.Router()

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update user profile
router.put(
  "/profile",
  auth,
  [
    body("name").optional().isString().trim(),
    body("age").optional().isInt({ min: 0, max: 150 }),
    body("gender").optional().isIn(["M", "F", "Other"]),
    body("weight").optional().isFloat({ min: 20, max: 300 }),
    body("height").optional().isFloat({ min: 100, max: 250 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, age, gender, weight, height } = req.body

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { name, age, gender, weight, height },
        { new: true },
      ).select("-password")

      res.json(user)
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get health statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const Prediction = require("../models/Prediction")
    const predictions = await Prediction.find({ userId: req.user.userId })

    const stats = {
      totalPredictions: predictions.length,
      riskDistribution: {
        high: predictions.filter((p) => p.riskLevel === "High").length,
        medium: predictions.filter((p) => p.riskLevel === "Medium").length,
        low: predictions.filter((p) => p.riskLevel === "Low").length,
      },
      diseaseFrequency: {},
      averageConfidence: 0,
    }

    // Calculate disease frequency
    predictions.forEach((p) => {
      stats.diseaseFrequency[p.predictedDisease] = (stats.diseaseFrequency[p.predictedDisease] || 0) + 1
    })

    // Calculate average confidence
    if (predictions.length > 0) {
      stats.averageConfidence = (predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length).toFixed(4)
    }

    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
