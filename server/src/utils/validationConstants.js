
const HEALTH_METRIC_RANGES = {
  age: { min: 0, max: 150 },
  weight: { min: 1, max: 300 },
  bloodPressureSystolic: { min: 60, max: 250 },
  bloodPressureDiastolic: { min: 30, max: 150 },
  glucose: { min: 20, max: 600 },
  cholesterol: { min: 40, max: 600 },
};

module.exports = { HEALTH_METRIC_RANGES };
