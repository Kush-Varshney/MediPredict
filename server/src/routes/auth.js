const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const router = express.Router()

// Register
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user exists
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Create new user
    user = new User({ name, email, password })
    await user.save()

    // Create JWT token
    const token = jwt.sign({ userId: user._id, role: user.role || "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user" },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id, role: user.role || "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user" },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
