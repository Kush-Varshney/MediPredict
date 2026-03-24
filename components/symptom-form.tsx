"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HEALTH_METRIC_RANGES, MESSAGES } from "@/lib/validation/health-metrics"

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
    bloodPressureSystolic: number | null
    bloodPressureDiastolic: number | null
    glucose: number | null
    cholesterol: number | null
    symptoms: string[]
  }) => void
  loading: boolean
}

export default function SymptomForm({ onSubmit, loading }: SymptomFormProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [customSymptom, setCustomSymptom] = useState("")
  const [age, setAge] = useState<number | "">("")
  const [gender, setGender] = useState<"M" | "F" | "Other">("M")
  const [weight, setWeight] = useState<number | "">("")
  const [bpSys, setBpSys] = useState<number | "">("")
  const [bpDia, setBpDia] = useState<number | "">("")
  const [glucose, setGlucose] = useState<number | "">("")
  const [cholesterol, setCholesterol] = useState<number | "">("")
  const [unknownMetrics, setUnknownMetrics] = useState({
    bloodPressure: false,
    glucose: false,
    cholesterol: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]))
  }

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom)) {
      setSelectedSymptoms([...selectedSymptoms, customSymptom])
      setCustomSymptom("")
    }
  }

  const validateValue = (name: keyof typeof HEALTH_METRIC_RANGES, value: number | "", optional = false) => {
    if (optional && value === "") return ""
    if (value === "") return `${HEALTH_METRIC_RANGES[name].label} is required`
    const { min, max, label, unit } = HEALTH_METRIC_RANGES[name]
    if (value < min || value > max) {
      return MESSAGES.rangeError(label, min, max, unit)
    }
    return ""
  }

  const handleChange = (_name: string, value: string, setter: (val: number | "") => void) => {
    if (value === "") {
      setter("")
      return
    }
    const num = parseFloat(value)
    if (!isNaN(num)) {
      setter(num)
      // Clear error if valid as they type? Or wait for blur? 
      // User asked for "live masking" which implies blocking invalid formats, 
      // but usually validation messages are better on blur or submit to avoid annoyance while typing.
      // However, "Frontend: block form submission and surface an inline error" is required.
    }
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    
    newErrors.age = validateValue("age", age)
    newErrors.weight = validateValue("weight", weight)
    const bpOptional = unknownMetrics.bloodPressure
    const glucoseOptional = unknownMetrics.glucose
    const cholesterolOptional = unknownMetrics.cholesterol

    newErrors.bloodPressureSystolic = validateValue("bloodPressureSystolic", bpSys, bpOptional)
    newErrors.bloodPressureDiastolic = validateValue("bloodPressureDiastolic", bpDia, bpOptional)
    newErrors.glucose = validateValue("glucose", glucose, glucoseOptional)
    newErrors.cholesterol = validateValue("cholesterol", cholesterol, cholesterolOptional)

    if (!bpOptional && ((bpSys === "" && bpDia !== "") || (bpSys !== "" && bpDia === ""))) {
      newErrors.bloodPressureSystolic = "Provide both systolic and diastolic BP, or mark as unknown"
      newErrors.bloodPressureDiastolic = "Provide both systolic and diastolic BP, or mark as unknown"
    }

    // Filter out empty error strings
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key]
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    if (selectedSymptoms.length === 0) {
      newErrors.symptoms = "Select at least one symptom to continue"
      setErrors(newErrors)
      return
    }

    onSubmit({
      age: Number(age),
      gender,
      weight: Number(weight),
      bloodPressureSystolic: unknownMetrics.bloodPressure || bpSys === "" ? null : Number(bpSys),
      bloodPressureDiastolic: unknownMetrics.bloodPressure || bpDia === "" ? null : Number(bpDia),
      glucose: unknownMetrics.glucose || glucose === "" ? null : Number(glucose),
      cholesterol: unknownMetrics.cholesterol || cholesterol === "" ? null : Number(cholesterol),
      symptoms: selectedSymptoms,
    })
  }

  const renderInput = (
    id: keyof typeof HEALTH_METRIC_RANGES, 
    value: number | "", 
    setter: (val: number | "") => void,
    errorKey: string = id
  ) => {
    const config = HEALTH_METRIC_RANGES[id]
    const hasError = !!errors[errorKey]
    const isOptionalUnknown =
      (id === "bloodPressureSystolic" || id === "bloodPressureDiastolic") ? unknownMetrics.bloodPressure :
      id === "glucose" ? unknownMetrics.glucose :
      id === "cholesterol" ? unknownMetrics.cholesterol :
      false
    
    return (
      <div>
        <label className="text-sm font-medium text-slate-200 block mb-1">
          {config.label} {config.unit ? `(${config.unit})` : ""}
        </label>
        <div className="space-y-2">
          <input
            type="number"
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onChange={(e) => handleChange(id, e.target.value, setter)}
            onBlur={() => {
              const error = validateValue(id, value, isOptionalUnknown)
              setErrors((prev) => ({ ...prev, [id]: error }))
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              hasError 
                ? "border-red-500 focus:ring-red-200" 
                : "border-slate-600 bg-slate-900/80 text-slate-100 focus:ring-cyan-400"
            }`}
            disabled={isOptionalUnknown}
            aria-invalid={hasError}
            aria-describedby={`${id}-hint ${id}-error`}
            placeholder={`Enter ${config.label.toLowerCase()}`}
          />
        </div>
        {/* Persistent helper text / range hint */}
        <p id={`${id}-hint`} className="text-xs text-slate-500 mt-1">
          Range: {config.min} – {config.max} {config.unit}
        </p>
        {/* Inline Error */}
        {hasError && (
          <p id={`${id}-error`} className="text-xs text-red-600 mt-1 font-medium" role="alert">
            {errors[errorKey]}
          </p>
        )}
      </div>
    )
  }

  return (
    <Card className="glass-panel shadow-lg border-slate-700 sticky top-8">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Select Your Symptoms</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {renderInput("age", age, setAge)}
            <div>
              <label className="text-sm font-medium text-slate-200 block mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-900/80 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
              {/* Spacer to align with inputs that have hints */}
              <p className="text-xs text-slate-700 mt-1">.</p>
            </div>
            
            {renderInput("weight", weight, setWeight, "weight")}
            
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {renderInput("bloodPressureSystolic", bpSys, setBpSys, "bloodPressureSystolic")}
              {renderInput("bloodPressureDiastolic", bpDia, setBpDia, "bloodPressureDiastolic")}
              <div className="col-span-2 rounded-lg border border-slate-700 bg-slate-800/70 p-2">
                <p className="text-xs font-medium text-slate-300 mb-2">Blood pressure availability</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUnknownMetrics((prev) => ({ ...prev, bloodPressure: false }))}
                    className={`px-2 py-1 text-xs rounded ${!unknownMetrics.bloodPressure ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white" : "bg-slate-900 text-slate-200 border border-slate-700"}`}
                  >
                    I know my values
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUnknownMetrics((prev) => ({ ...prev, bloodPressure: true }))
                      setBpSys("")
                      setBpDia("")
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.bloodPressureSystolic
                        delete next.bloodPressureDiastolic
                        return next
                      })
                    }}
                    className={`px-2 py-1 text-xs rounded ${unknownMetrics.bloodPressure ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white" : "bg-slate-900 text-slate-200 border border-slate-700"}`}
                  >
                    I don't know
                  </button>
                </div>
              </div>
            </div>
            
            {renderInput("glucose", glucose, setGlucose)}
            <div className="col-span-1 -mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setUnknownMetrics((prev) => ({ ...prev, glucose: false }))}
                className={`px-2 py-1 text-xs rounded ${!unknownMetrics.glucose ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white" : "bg-slate-900 text-slate-200 border border-slate-700"}`}
              >
                I know
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnknownMetrics((prev) => ({ ...prev, glucose: true }))
                  setGlucose("")
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.glucose
                    return next
                  })
                }}
                className={`px-2 py-1 text-xs rounded ${unknownMetrics.glucose ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white" : "bg-slate-900 text-slate-200 border border-slate-700"}`}
              >
                Unknown
              </button>
            </div>
            {renderInput("cholesterol", cholesterol, setCholesterol)}
            <div className="col-span-1 -mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setUnknownMetrics((prev) => ({ ...prev, cholesterol: false }))}
                className={`px-2 py-1 text-xs rounded ${!unknownMetrics.cholesterol ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white" : "bg-slate-900 text-slate-200 border border-slate-700"}`}
              >
                I know
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnknownMetrics((prev) => ({ ...prev, cholesterol: true }))
                  setCholesterol("")
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.cholesterol
                    return next
                  })
                }}
                className={`px-2 py-1 text-xs rounded ${unknownMetrics.cholesterol ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white" : "bg-slate-900 text-slate-200 border border-slate-700"}`}
              >
                Unknown
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-200 block mb-3">Common Symptoms</label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSymptoms.includes(symptom)
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>
          {errors.symptoms && <p className="text-xs text-red-600 -mt-2">{errors.symptoms}</p>}

          <div className="border-t border-slate-700 pt-4">
            <label className="text-sm font-medium text-slate-200 block mb-2">Add Custom Symptom</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCustomSymptom()}
                placeholder="Enter symptom..."
                className="flex-1 px-3 py-2 border border-slate-600 bg-slate-900/80 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <Button
                onClick={addCustomSymptom}
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-200 hover:bg-slate-800 bg-transparent"
              >
                Add
              </Button>
            </div>
          </div>

          {selectedSymptoms.length > 0 && (
            <div className="bg-slate-800/70 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-300 mb-2">Selected ({selectedSymptoms.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((symptom) => (
                  <div
                    key={symptom}
                    className="bg-slate-700 text-slate-100 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                  >
                    {symptom}
                    <button onClick={() => toggleSymptom(symptom)} className="ml-1 hover:text-white">
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
            className="w-full font-medium py-2 rounded-lg"
          >
            {loading ? "Analyzing..." : "Get Prediction"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
