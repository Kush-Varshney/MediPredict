"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
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
  const [age, setAge] = useState<number | "">(30)
  const [gender, setGender] = useState<"M" | "F" | "Other">("M")
  const [weight, setWeight] = useState<number | "">(70)
  const [bpSys, setBpSys] = useState<number | "">(120)
  const [bpDia, setBpDia] = useState<number | "">(80)
  const [glucose, setGlucose] = useState<number | "">(100)
  const [cholesterol, setCholesterol] = useState<number | "">(180)
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

  const validateValue = (name: keyof typeof HEALTH_METRIC_RANGES, value: number | "") => {
    if (value === "") return `${HEALTH_METRIC_RANGES[name].label} is required`
    const { min, max, label, unit } = HEALTH_METRIC_RANGES[name]
    if (value < min || value > max) {
      return MESSAGES.rangeError(label, min, max, unit)
    }
    return ""
  }

  const handleBlur = (name: keyof typeof HEALTH_METRIC_RANGES, value: number | "") => {
    const error = validateValue(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const handleChange = (name: string, value: string, setter: (val: number | "") => void) => {
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
    newErrors.bloodPressureSystolic = validateValue("bloodPressureSystolic", bpSys)
    newErrors.bloodPressureDiastolic = validateValue("bloodPressureDiastolic", bpDia)
    newErrors.glucose = validateValue("glucose", glucose)
    newErrors.cholesterol = validateValue("cholesterol", cholesterol)

    // Filter out empty error strings
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key]
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    if (selectedSymptoms.length === 0) {
      // Maybe show an error for symptoms too?
      return
    }

    onSubmit({
      age: Number(age),
      gender,
      weight: Number(weight),
      bloodPressureSystolic: Number(bpSys),
      bloodPressureDiastolic: Number(bpDia),
      glucose: Number(glucose),
      cholesterol: Number(cholesterol),
      symptoms: selectedSymptoms,
    })
  }

  const renderInput = (
    id: keyof typeof HEALTH_METRIC_RANGES, 
    value: number | "", 
    setter: (val: number | "") => void,
    errorKey: string = id,
    useSlider: boolean = false
  ) => {
    const config = HEALTH_METRIC_RANGES[id]
    const hasError = !!errors[errorKey]
    
    return (
      <div>
        <label className="text-sm font-medium text-medical-700 block mb-1">
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
            onBlur={() => handleBlur(id, value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              hasError 
                ? "border-red-500 focus:ring-red-200" 
                : "border-medical-300 focus:ring-medical-500"
            }`}
            aria-invalid={hasError}
            aria-describedby={`${id}-hint ${id}-error`}
          />
          {useSlider && (
            <Slider
              min={config.min}
              max={config.max}
              step={config.step}
              value={value === "" ? config.min : value}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setter(val)
                // Clear error on slider move if valid?
                if (val >= config.min && val <= config.max) {
                   setErrors((prev) => {
                      const newErrs = { ...prev }
                      delete newErrs[id]
                      return newErrs
                   })
                }
              }}
            />
          )}
        </div>
        {/* Persistent helper text / range hint */}
        <p id={`${id}-hint`} className="text-xs text-gray-500 mt-1">
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
    <Card className="bg-white shadow-lg border-medical-200 sticky top-8">
      <div className="p-6">
        <h2 className="text-xl font-bold text-medical-900 mb-4">Select Your Symptoms</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {renderInput("age", age, setAge)}
            <div>
              <label className="text-sm font-medium text-medical-700 block mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
              {/* Spacer to align with inputs that have hints */}
              <p className="text-xs text-transparent mt-1">Spacer</p>
            </div>
            
            {renderInput("weight", weight, setWeight, "weight", true)}
            
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {renderInput("bloodPressureSystolic", bpSys, setBpSys, "bloodPressureSystolic")}
              {renderInput("bloodPressureDiastolic", bpDia, setBpDia, "bloodPressureDiastolic")}
            </div>
            
            {renderInput("glucose", glucose, setGlucose)}
            {renderInput("cholesterol", cholesterol, setCholesterol)}
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
