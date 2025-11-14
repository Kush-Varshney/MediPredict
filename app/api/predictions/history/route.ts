import { type NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const url = new URL(`${API_BASE}/api/predict/history`)
    url.search = new URL(request.url).search

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: authHeader },
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
