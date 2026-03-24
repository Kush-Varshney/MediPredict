"""Input validation for ML service"""

SUPPORTED_SYMPTOMS = {
    "chest pain", "shortness of breath", "fatigue", "dizziness",
    "headache", "fever", "cough", "runny nose", "sore throat",
    "nausea", "vomiting", "diarrhea", "loss of appetite", "abdominal pain",
    "joint pain", "muscle pain", "body aches", "body pain", "rash", "chills", "congestion",
    "dry mouth", "weakness", "sweating", "tremor", "anxiety", "insomnia",
    "back pain", "neck pain", "shoulder pain", "arm pain", "leg pain",
    "numbness", "tingling", "itching", "bruising", "swelling",
}

def normalize_symptom(symptom_str: str) -> str:
    """Normalize symptom string for matching"""
    import re
    s = str(symptom_str).strip().lower()
    # Remove extra spaces and punctuation
    s = re.sub(r"[\s_]+", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = s.strip()
    
    # Common mappings
    mappings = {
        "runny nose": "nasal congestion",
        "stuffy nose": "nasal congestion",
        "pain in joints": "joint pain",
        "pain in muscles": "muscle pain",
        "feeling tired": "fatigue",
        "feeling weak": "weakness",
    }
    return mappings.get(s, s)

def validate_prediction_input(data):
    """
    Validate prediction input data
    
    Args:
        data: Dictionary containing prediction features
        
    Raises:
        ValueError: If validation fails
    """
    symptoms = data.get('symptoms', [])

    age = data.get('age')
    if not isinstance(age, (int, float)) or age < 0 or age > 150:
        raise ValueError("Age must be a number between 0 and 150")

    gender = data.get('gender')
    if gender not in [0, 0.5, 1]:
        raise ValueError("Gender must be 0 (Female), 1 (Male), or 0.5 (Other)")

    weight = data.get('weight')
    if not isinstance(weight, (int, float)) or weight < 1 or weight > 300:
        raise ValueError("Weight must be between 1 and 300 kg")

    # Optional metrics: null/omitted means unknown and should not fail validation
    sys_bp = data.get('blood_pressure_systolic')
    dia_bp = data.get('blood_pressure_diastolic')
    if (sys_bp is None) != (dia_bp is None):
        raise ValueError("Provide both systolic and diastolic BP, or leave both unknown")
    if sys_bp is not None and (not isinstance(sys_bp, (int, float)) or sys_bp < 60 or sys_bp > 250):
        raise ValueError("Systolic BP must be between 60 and 250")
    if dia_bp is not None and (not isinstance(dia_bp, (int, float)) or dia_bp < 30 or dia_bp > 150):
        raise ValueError("Diastolic BP must be between 30 and 150")

    glucose = data.get('glucose')
    if glucose is not None and (not isinstance(glucose, (int, float)) or glucose < 20 or glucose > 600):
        raise ValueError("Glucose must be between 20 and 600 mg/dL")

    cholesterol = data.get('cholesterol')
    if cholesterol is not None and (not isinstance(cholesterol, (int, float)) or cholesterol < 40 or cholesterol > 600):
        raise ValueError("Cholesterol must be between 40 and 600 mg/dL")
    
    symptoms = data.get('symptoms', [])
    if symptoms:
        if not isinstance(symptoms, list):
            raise ValueError("Symptoms must be a list")
        if len(symptoms) > 50:
            raise ValueError("Maximum 50 symptoms allowed")
        # Accept either binary vector or list of names (strings)
        if not all(isinstance(s, (int, float, str)) for s in symptoms):
            raise ValueError("Each symptom must be a string or 0/1")
        
        unrecognized = []
        for s in symptoms:
            if isinstance(s, str):
                norm = normalize_symptom(s)
                if norm and norm not in SUPPORTED_SYMPTOMS:
                    unrecognized.append(s)
        
        if unrecognized:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Unrecognized symptoms: {unrecognized}. Model may have lower accuracy.")

def validate_batch_input(predictions):
    """
    Validate batch prediction input
    
    Args:
        predictions: List of prediction dictionaries
        
    Raises:
        ValueError: If validation fails
    """
    if not isinstance(predictions, list):
        raise ValueError("Predictions must be a list")
    
    if len(predictions) == 0:
        raise ValueError("Predictions list cannot be empty")
    
    if len(predictions) > 100:
        raise ValueError("Maximum 100 predictions per batch")
    
    for i, pred in enumerate(predictions):
        try:
            validate_prediction_input(pred)
        except ValueError as e:
            raise ValueError(f"Prediction {i}: {str(e)}")
