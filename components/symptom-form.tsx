"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const COMMON_SYMPTOMS = [
  "Fever",
  "Cough",
  "Headache",
  "Fatigue",
  "Sore Throat",
  "Shortness of Breath",
  "Chest Pain",
  "Nausea",
  "Dizziness",
  "Body Aches",
  "Chills",
  "Loss of Appetite",
  "Congestion",
  "Sneezing",
  "Runny Nose",
]

interface SymptomFormProps {
  onSubmit: (payload: {
    age: number
    gender: "M" | "F" | "Other"
    weight: number
    bloodPressureSystolic: number
    bloodPressureDiastolic: number
    glucose: number
    cholesterol: number
    symptoms: string[]
  }) => void
  loading: boolean
}

export default function SymptomForm({ onSubmit, loading }: SymptomFormProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [customSymptom, setCustomSymptom] = useState("")
  const [age, setAge] = useState<number>(30)
  const [gender, setGender] = useState<"M" | "F" | "Other">("M")
  const [weight, setWeight] = useState<number>(70)
  const [bpSys, setBpSys] = useState<number>(120)
  const [bpDia, setBpDia] = useState<number>(80)
  const [glucose, setGlucose] = useState<number>(100)
  const [cholesterol, setCholesterol] = useState<number>(180)

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]))
  }

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom)) {
      setSelectedSymptoms([...selectedSymptoms, customSymptom])
      setCustomSymptom("")
    }
  }

  const handleSubmit = () => {
    if (selectedSymptoms.length === 0) {
      return
    }

    const validationErrors: string[] = []
    if (age < 1 || age > 150) validationErrors.push("Age must be 1-150")
    if (weight < 20 || weight > 300) validationErrors.push("Weight must be 20-300 kg")
    if (bpSys < 50 || bpSys > 250) validationErrors.push("BP Systolic must be 50-250")
    if (bpDia < 30 || bpDia > 150) validationErrors.push("BP Diastolic must be 30-150")
    if (glucose < 40 || glucose > 400) validationErrors.push("Glucose must be 40-400 mg/dL")
    if (cholesterol < 50 || cholesterol > 500) validationErrors.push("Cholesterol must be 50-500 mg/dL")

    if (validationErrors.length > 0) {
      console.warn("[v0] Form validation failed:", validationErrors)
      return
    }

    onSubmit({
      age,
      gender,
      weight,
      bloodPressureSystolic: bpSys,
      bloodPressureDiastolic: bpDia,
      glucose,
      cholesterol,
      symptoms: selectedSymptoms,
    })
  }

  return (
    <Card className="bg-white shadow-lg border-medical-200 sticky top-8">
      <div className="p-6">
        <h2 className="text-xl font-bold text-medical-900 mb-4">Select Your Symptoms</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-medical-700 block mb-2">Age</label>
              <input
                type="number"
                min={0}
                max={150}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-medical-700 block mb-2">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-medical-700 block mb-2">Weight (kg)</label>
              <input
                type="number"
                min={20}
                max={300}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 col-span-2">
              <div>
                <label className="text-sm font-medium text-medical-700 block mb-2">BP Systolic</label>
                <input
                  type="number"
                  min={50}
                  max={250}
                  value={bpSys}
                  onChange={(e) => setBpSys(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-medical-700 block mb-2">BP Diastolic</label>
                <input
                  type="number"
                  min={30}
                  max={150}
                  value={bpDia}
                  onChange={(e) => setBpDia(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-medical-700 block mb-2">Glucose (mg/dL)</label>
              <input
                type="number"
                min={40}
                max={400}
                value={glucose}
                onChange={(e) => setGlucose(Number(e.target.value))}
                className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-medical-700 block mb-2">Cholesterol (mg/dL)</label>
              <input
                type="number"
                min={50}
                max={500}
                value={cholesterol}
                onChange={(e) => setCholesterol(Number(e.target.value))}
                className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-medical-700 block mb-3">Common Symptoms</label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSymptoms.includes(symptom)
                      ? "bg-medical-600 text-white"
                      : "bg-medical-100 text-medical-700 hover:bg-medical-200"
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-medical-200 pt-4">
            <label className="text-sm font-medium text-medical-700 block mb-2">Add Custom Symptom</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCustomSymptom()}
                placeholder="Enter symptom..."
                className="flex-1 px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
              <Button
                onClick={addCustomSymptom}
                variant="outline"
                size="sm"
                className="border-medical-300 text-medical-600 hover:bg-medical-50 bg-transparent"
              >
                Add
              </Button>
            </div>
          </div>

          {selectedSymptoms.length > 0 && (
            <div className="bg-medical-50 rounded-lg p-3">
              <p className="text-xs font-medium text-medical-600 mb-2">Selected ({selectedSymptoms.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((symptom) => (
                  <div
                    key={symptom}
                    className="bg-medical-200 text-medical-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                  >
                    {symptom}
                    <button onClick={() => toggleSymptom(symptom)} className="ml-1 hover:text-medical-900">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-medical-600 hover:bg-medical-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? "Analyzing..." : "Get Prediction"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
