"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function Header() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    router.push("/")
  }

  return (
    <header className="bg-white shadow-sm border-b border-medical-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-medical-600 to-medical-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-medical-900">MediPredict</h1>
              <p className="text-sm text-medical-500">AI-Powered Health Insights</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="text-medical-600 border-medical-200 hover:bg-medical-50 bg-transparent"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={handleLogout} className="bg-medical-600 hover:bg-medical-700 text-white">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button
                    variant="outline"
                    className="text-medical-600 border-medical-200 hover:bg-medical-50 bg-transparent"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="bg-medical-600 hover:bg-medical-700 text-white">Sign Up</Button>
                </Link>
              </>
            )}
            <div className="text-right hidden md:block">
              <p className="text-sm text-medical-600">Powered by Advanced ML & Gemini AI</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
