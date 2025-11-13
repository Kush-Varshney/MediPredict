const express = require("express")
const axios = require("axios")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const app = express()

// Provide a safe default for ML service URL if not configured
if (!process.env.ML_SERVICE_URL) {
  process.env.ML_SERVICE_URL = "http://127.0.0.1:5001"
}
// Prefer IPv4 when localhost is used (avoid macOS AirPlay on ::1)
if (process.env.ML_SERVICE_URL === "http://localhost:5001") {
  process.env.ML_SERVICE_URL = "http://127.0.0.1:5001"
}

// Security middleware
app.use(helmet())
app.use(morgan("combined"))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Middleware
app.use(cors())
app.use(express.json())

// ML health status (in-memory)
let mlHealth = {
  reachable: false,
  lastChecked: null,
  modelLoaded: false,
  statusCode: null,
  errorMessage: null,
}

async function checkMLHealth() {
  const url = (process.env.ML_SERVICE_URL || "http://127.0.0.1:5001").replace(/\/$/, "") + "/health"
  try {
    const res = await axios.get(url, { timeout: 3000 })
    const data = res.data || {}
    mlHealth = {
      reachable: true,
      lastChecked: new Date().toISOString(),
      modelLoaded: !!data.model_loaded,
      statusCode: res.status,
      errorMessage: null,
    }
    if (!mlHealth.modelLoaded) {
      console.warn("[ML Health] Service reachable but model not loaded")
    }
  } catch (err) {
    mlHealth = {
      reachable: false,
      lastChecked: new Date().toISOString(),
      modelLoaded: false,
      statusCode: err.response?.status || null,
      errorMessage: err.message || String(err),
    }
    console.error("[ML Health] Service unreachable:", mlHealth.errorMessage)
  }
}

// Initial health probe and optional periodic monitoring
checkMLHealth()
const pingInterval = Number(process.env.ML_HEALTH_PING_INTERVAL_MS || 60000)
if (Number.isFinite(pingInterval) && pingInterval > 0) {
  setInterval(checkMLHealth, pingInterval)
}

// MongoDB Connection
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Connection pool settings to prevent buffering timeout
  maxPoolSize: 10,
  minPoolSize: 5,
  // Socket timeout: 45 seconds
  socketTimeoutMS: 45000,
  // Server selection timeout: 5 seconds
  serverSelectionTimeoutMS: 5000,
  // Connection timeout: 10 seconds
  connectTimeoutMS: 10000,
  // Family: 4 for IPv4 (avoid macOS AirPlay on IPv6)
  family: 4,
}

// Fail-fast on commands when not connected to MongoDB
mongoose.set("bufferCommands", false)

mongoose
  .connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log("[MongoDB] Connected successfully")
    console.log("[MongoDB] Pool size: min=" + mongooseOptions.minPoolSize + ", max=" + mongooseOptions.maxPoolSize)
  })
  .catch((err) => {
    console.error("[MongoDB] Connection error:", err.message)
    // Log the specific error type for debugging
    if (err.name === "MongooseError") {
      console.error("[MongoDB] Error type: MongooseError")
    } else if (err.name === "MongoError") {
      console.error("[MongoDB] Error type: MongoError")
    }
    // Continue running so non-DB routes (e.g., public prediction) work
  })

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected from database")
})

mongoose.connection.on("error", (err) => {
  console.error("[MongoDB] Connection error event:", err.message)
})

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/predict", require("./routes/predict"))
// Public prediction route disabled to enforce authentication-only access
// app.use("/api/predict/public", require("./routes/predict_public"))
app.use("/api/user", require("./routes/user"))

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "MediPredict Backend",
    mlServiceUrl: process.env.ML_SERVICE_URL,
    mlHealth,
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  })
})

// ML health endpoint (proxies ML service health and reports cached status)
app.get("/api/health/ml", async (req, res) => {
  await checkMLHealth()
  res.json({
    mlServiceUrl: process.env.ML_SERVICE_URL,
    ...mlHealth,
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    type: err.type || "server_error",
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
