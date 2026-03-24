"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Signup failed")
        return
      }

      // Store token and redirect
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      router.push("/dashboard")
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen premium-bg px-4 py-10">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <Card className="glass-panel p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-xs text-teal-200 mb-5">
              Build your AI health profile
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">Create your MediPredict account</h1>
            <p className="text-slate-300 mt-4">
              Get intelligent, explainable predictions and a timeline of your health insights in one secure workspace.
            </p>
          </div>
          <div className="space-y-3 mt-8">
            {[
              "Actionable recommendations based on symptoms and metrics",
              "Professional dashboard with risk-focused visualization",
              "History-driven monitoring for better follow-up decisions",
            ].map((point) => (
              <div key={point} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
                {point}
              </div>
            ))}
          </div>
        </Card>
        <Card className="glass-panel w-full">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <h1 className="text-2xl font-bold text-white">MediPredict</h1>
            </div>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Start with a modern, trustworthy AI-assisted health experience</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Full Name</label>
              <Input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <Input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Confirm Password</label>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full bg-medical-600 hover:bg-medical-700" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link href="/auth/login" className="text-cyan-300 font-semibold hover:text-cyan-200">
              Sign in
            </Link>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
