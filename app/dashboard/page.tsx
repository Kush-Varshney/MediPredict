"use client"

import { useEffect, useState } from "react"
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
    bloodPressureSystolic: number
    bloodPressureDiastolic: number
    glucose: number
    cholesterol: number
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
        setCurrentPrediction(data)
        return
      }

      setCurrentPrediction(data)
      
      // Refresh history first to ensure it's up to date
      await fetchPredictionHistory()
      
      // Open success modal instead of setting notice string
      setSuccessModalOpen(true)
    } catch (error) {
      console.error("[v0] Prediction error:", error)
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
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-medical-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-medical-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-medical-600 to-medical-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <h1 className="text-2xl font-bold text-medical-900">MediPredict</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-medical-600">Welcome, {user.name}</span>
            <Button variant="outline" onClick={handleLogout}>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <SymptomForm onSubmit={handleSubmit} loading={loading} />
              </div>
              <div className="lg:col-span-2">
                {error && !loading && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {/* Notice Alert removed in favor of Modal */}
                {loading && (
                  <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto mb-4"></div>
                      <p className="text-medical-600 font-medium">Analyzing symptoms...</p>
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
                  <div className="bg-white rounded-lg shadow-lg p-8 text-center h-96 flex items-center justify-center">
                    <div>
                      <p className="text-medical-600 text-lg font-medium">Enter your symptoms to get started</p>
                      <p className="text-medical-400 mt-2">
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
