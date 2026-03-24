"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
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
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 mb-5">
              AI-powered health insights
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">Welcome back to MediPredict</h1>
            <p className="text-slate-300 mt-4">
              Clinical-style intelligence for symptom analysis, risk stratification, and explainable recommendations.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
            {["Smart triage workflow", "Transparent confidence insights", "Symptom + metrics context", "Secure prediction history"].map((feature) => (
              <div key={feature} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
                {feature}
              </div>
            ))}
          </div>
        </Card>
        <Card className="glass-panel w-full">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center shadow-[0_0_16px_rgba(45,212,191,0.4)]">
                <span className="text-white font-bold">M</span>
              </div>
              <h1 className="text-2xl font-bold text-white">MediPredict</h1>
            </div>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Access your dashboard, predictions, and personalized health insights</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full bg-medical-600 hover:bg-medical-700" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-slate-400">Don't have an account? </span>
            <Link href="/auth/signup" className="text-cyan-300 font-semibold hover:text-cyan-200">
              Sign up
            </Link>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
