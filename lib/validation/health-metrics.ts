
export interface HealthMetricConfig {
  min: number;
  max: number;
  step: number;
  label: string;
  unit?: string;
}

export const HEALTH_METRIC_RANGES: Record<"age" | "weight" | "bloodPressureSystolic" | "bloodPressureDiastolic" | "glucose" | "cholesterol", HealthMetricConfig> = {
  age: { min: 0, max: 150, step: 1, label: "Age" },
  weight: { min: 1, max: 300, step: 0.1, label: "Weight", unit: "kg" },
  bloodPressureSystolic: { min: 60, max: 250, step: 1, label: "Systolic BP", unit: "mmHg" },
  bloodPressureDiastolic: { min: 30, max: 150, step: 1, label: "Diastolic BP", unit: "mmHg" },
  glucose: { min: 20, max: 600, step: 1, label: "Glucose", unit: "mg/dL" },
  cholesterol: { min: 40, max: 600, step: 1, label: "Cholesterol", unit: "mg/dL" },
};

export const MESSAGES = {
  rangeError: (label: string, min: number, max: number, unit?: string) => 
    `${label} must be between ${min} and ${max}${unit ? ` ${unit}` : ''}`,
};
