const mongoose = require("mongoose")

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  age: Number,
  gender: String,
  weight: Number,
  bloodPressureSystolic: Number,
  bloodPressureDiastolic: Number,
  glucose: Number,
  cholesterol: Number,
  symptoms: [String],
  predictedDisease: String,
  confidence: Number,
  confidencePercent: Number,
  riskLevel: String,
  precautions: [String],
  diet: [String],
  aiExplanation: String,
  usedSymptomsPath: { type: Boolean, default: false },
  matchedSymptoms: { type: Number, default: 0 },
  modelType: { type: String, default: "" },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Prediction", predictionSchema)
