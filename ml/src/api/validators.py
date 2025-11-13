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
    return s.strip()

def validate_prediction_input(data):
    """
    Validate prediction input data
    
    Args:
        data: Dictionary containing prediction features
        
    Raises:
        ValueError: If validation fails
    """
    # If symptoms-only mode (list of strings), allow skipping vitals
    symptoms = data.get('symptoms', [])
    symptoms_only = isinstance(symptoms, list) and (len(symptoms) > 0) and isinstance(symptoms[0], (str,))

    if not symptoms_only:
        required_fields = [
            'age', 'gender', 'weight',
            'blood_pressure_systolic', 'blood_pressure_diastolic',
            'glucose', 'cholesterol'
        ]
        # Check required fields for vitals path
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
    
    if not symptoms_only:
        # Validate age
        age = data.get('age')
        if not isinstance(age, (int, float)) or age < 0 or age > 150:
            raise ValueError("Age must be a number between 0 and 150")
    
    if not symptoms_only:
        # Validate gender
        gender = data.get('gender')
        if gender not in [0, 1]:
            raise ValueError("Gender must be 0 (Female) or 1 (Male)")
    
    if not symptoms_only:
        # Validate weight
        weight = data.get('weight')
        if not isinstance(weight, (int, float)) or weight < 20 or weight > 300:
            raise ValueError("Weight must be between 20 and 300 kg")
    
    if not symptoms_only:
        # Validate blood pressure
        sys_bp = data.get('blood_pressure_systolic')
        dia_bp = data.get('blood_pressure_diastolic')
        if not isinstance(sys_bp, (int, float)) or sys_bp < 50 or sys_bp > 250:
            raise ValueError("Systolic BP must be between 50 and 250")
        if not isinstance(dia_bp, (int, float)) or dia_bp < 30 or dia_bp > 150:
            raise ValueError("Diastolic BP must be between 30 and 150")
    
    if not symptoms_only:
        # Validate glucose
        glucose = data.get('glucose')
        if not isinstance(glucose, (int, float)) or glucose < 40 or glucose > 400:
            raise ValueError("Glucose must be between 40 and 400 mg/dL")
    
    if not symptoms_only:
        # Validate cholesterol
        cholesterol = data.get('cholesterol')
        if not isinstance(cholesterol, (int, float)) or cholesterol < 50 or cholesterol > 500:
            raise ValueError("Cholesterol must be between 50 and 500 mg/dL")
    
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
