import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Enforce authentication before proxying to backend
    let authHeader = request.headers.get("authorization") || ""
    if (!authHeader) {
      try {
        const token = cookies().get("token")?.value || ""
        if (token) authHeader = `Bearer ${token}`
      } catch {}
    }
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "Please sign in to access prediction features",
          hint: "Use /auth/login or /auth/signup to obtain a JWT token",
        },
        { status: 401 },
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let resp: Response | null = null
    try {
      resp = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (e) {
      const err = e as Error
      console.error("[Predict] Auth request failed:", err.message)
      return NextResponse.json(
        {
          error: "Backend service unavailable",
          message: "Make sure backend is running on port 3001",
          details: err.message,
          hint: "Steps to fix: 1. Check if backend is running (port 3001), 2. Check ML service is running (port 5001), 3. Check environment variables are set",
        },
        { status: 503 },
      )
    } finally {
      clearTimeout(timeoutId)
    }
    // No public fallback: predictions require authentication

    let data: any = {}
    try {
      data = await resp.json()
    } catch (parseError) {
      console.error("[Predict] JSON parse error:", parseError)
      return NextResponse.json(
        {
          error: `Invalid response from backend (${resp.status})`,
          message: resp.statusText || "Unknown error",
        },
        { status: resp.status || 500 },
      )
    }

    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Proxy error:", error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: "Failed to process prediction",
        details: message,
        hint: "Check browser console and server logs for details",
      },
      { status: 500 },
    )
  }
}
