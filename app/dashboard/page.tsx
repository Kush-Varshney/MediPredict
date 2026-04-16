"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SymptomForm from "@/components/symptom-form"
import PredictionResults from "@/components/prediction-results"
import { HealthInsightsSkeleton } from "@/components/health-insights"
import ErrorBoundary from "@/components/error-boundary"
import HealthTrends from "@/components/health-trends"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { retryFetch, parseJsonSafe } from "@/lib/http"
import { scrollToElementWithOffset } from "@/lib/scroll"
import PredictionSuccessModal from "@/components/prediction-success-modal"
import HistoryList from "@/components/history-list"

const HealthInsights = dynamic(() => import("@/components/health-insights"), {
  loading: () => <HealthInsightsSkeleton />,
  ssr: true,
})

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [predictions, setPredictions] = useState<any[]>([])
  const [currentPrediction, setCurrentPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("predict")
  const resultsSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/auth/login")
      return
    }

    setUser(JSON.parse(userData))
    fetchPredictionHistory()
  }, [router])

  const fetchPredictionHistory = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await retryFetch(`/api/predictions/history`, {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 15000,
        retries: 1,
      })

      if (response.ok) {
        const data = await response.json()
        setPredictions(data.predictions || [])
      }
    } catch (error) {
      console.error("Failed to fetch history:", error)
    }
  }

  const handleSubmit = async (payload: {
    age: number
    gender: "M" | "F" | "Other"
    weight: number
    bloodPressureSystolic: number | null
    bloodPressureDiastolic: number | null
    glucose: number | null
    cholesterol: number | null
    symptoms: string[]
  }) => {
    setSymptoms(payload.symptoms)
    setLoading(true)
    setError(null)
    setSuccessModalOpen(false)

    try {
      const token = localStorage.getItem("token")
      const response = await retryFetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        timeoutMs: 20000,
        retries: 2,
        retryDelayMs: 600,
      })

      const data = await parseJsonSafe(response)

      if (!response.ok) {
        const code = (data as any)?.error || (data as any)?.code
        const msg = (data as any)?.message || "Prediction failed"
        const hint = (data as any)?.hint
        const url = (data as any)?.mlServiceUrl
        setError(
          [msg, code ? `(${code})` : null, hint ? `Hint: ${hint}` : null, url ? `Service: ${url}` : null]
            .filter(Boolean)
            .join(" \u2022 "),
        )
        return
      }

      setCurrentPrediction(data)

      // Refresh history first to ensure it's up to date
      await fetchPredictionHistory()

      setSuccessModalOpen(true)
      requestAnimationFrame(() => {
        scrollToElementWithOffset(resultsSectionRef.current, 120)
      })
    } catch (error) {
      console.error("Prediction error:", error)
      setError(
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Network error. Please check your connection and try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen premium-bg">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">MediPredict</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">Welcome, {user.name}</span>
            <Button variant="outline" onClick={handleLogout} className="border-slate-700 text-slate-200">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predict">New Prediction</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="predict" className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
              <h2 className="text-2xl font-bold text-slate-100">Clinical Prediction Workspace</h2>
              <p className="text-slate-400 mt-1">
                Add symptoms and health metrics for a unified clinical prediction and recommendation workflow.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <SymptomForm onSubmit={handleSubmit} loading={loading} />
              </div>
              <div ref={resultsSectionRef} className="lg:col-span-2 scroll-mt-28 md:scroll-mt-32">
                {error && !loading && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {/* Notice Alert removed in favor of Modal */}
                {loading && (
                  <div className="flex items-center justify-center h-96 bg-slate-900/70 border border-slate-700 rounded-lg shadow-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                      <p className="text-slate-200 font-medium">Analyzing symptoms...</p>
                    </div>
                  </div>
                )}
                {currentPrediction && !loading && (
                  <ErrorBoundary>
                    <PredictionResults prediction={currentPrediction} symptoms={symptoms} />
                    <HealthInsights prediction={currentPrediction} />
                  </ErrorBoundary>
                )}
                {!currentPrediction && !loading && (
                  <div className="bg-slate-900/70 border border-slate-700 rounded-lg shadow-lg p-8 text-center h-96 flex items-center justify-center">
                    <div>
                      <p className="text-slate-200 text-lg font-medium">Enter your symptoms to get started</p>
                      <p className="text-slate-400 mt-2">
                        Our AI will analyze your symptoms and provide health insights
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prediction History</CardTitle>
                <CardDescription>Your previous health predictions and analyses</CardDescription>
              </CardHeader>
              <CardContent>
                {predictions.length > 0 && <HealthTrends predictions={predictions as any} />}
                <div className="mt-6">
                  <HistoryList predictions={predictions} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PredictionSuccessModal 
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        prediction={currentPrediction}
        onViewDetails={() => setSuccessModalOpen(false)}
        onViewHistory={() => {
          setSuccessModalOpen(false)
          setActiveTab("history")
        }}
      />
    </div>
  )
}
