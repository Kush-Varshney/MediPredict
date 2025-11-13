from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os
import logging
from dotenv import load_dotenv
from datetime import datetime
from functools import wraps
import traceback
from predictor import DiseasePredictor
from validators import validate_prediction_input, validate_batch_input

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize predictor
MODEL_PATH = os.getenv('MODEL_PATH', 'models/model.pkl')
SCALER_PATH = os.getenv('SCALER_PATH', 'models/scaler.pkl')

try:
    predictor = DiseasePredictor(MODEL_PATH, SCALER_PATH)
    logger.info(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    predictor = None

# Error handler decorator
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Validation error: {str(e)}")
            return jsonify({'error': str(e), 'type': 'validation_error'}), 400
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'error': 'Internal server error', 'type': 'server_error'}), 500
    return decorated_function

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'MediPredict ML Service',
        'timestamp': datetime.utcnow().isoformat(),
        'model_loaded': predictor is not None
    }), 200

@app.route('/predict', methods=['POST'])
@handle_errors
def predict():
    """
    Make single disease prediction
    
    Expected JSON:
    {
        "age": 45,
        "gender": 1,
        "weight": 75,
        "blood_pressure_systolic": 130,
        "blood_pressure_diastolic": 85,
        "glucose": 110,
        "cholesterol": 200,
        "symptoms": [1, 0, 1, 0]
    }
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    data = request.get_json()
    if not data:
        raise ValueError("Request body must be JSON")
    
    # Validate input
    validate_prediction_input(data)
    
    # Make prediction
    result = predictor.predict(data)
    
    logger.info(f"Prediction made: {result['predicted_disease']}")
    return jsonify(result), 200

@app.route('/predict-batch', methods=['POST'])
@handle_errors
def predict_batch():
    """
    Make batch predictions
    
    Expected JSON:
    {
        "predictions": [
            {"age": 45, "gender": 1, ...},
            {"age": 55, "gender": 0, ...}
        ]
    }
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    data = request.get_json()
    if not data or 'predictions' not in data:
        raise ValueError("Request must contain 'predictions' array")
    
    predictions_data = data['predictions']
    if not isinstance(predictions_data, list):
        raise ValueError("'predictions' must be an array")
    
    if len(predictions_data) > 100:
        raise ValueError("Maximum 100 predictions per batch")
    
    # Validate all inputs
    for pred_data in predictions_data:
        validate_prediction_input(pred_data)
    
    # Make predictions
    results = []
    for pred_data in predictions_data:
        result = predictor.predict(pred_data)
        results.append(result)
    
    logger.info(f"Batch prediction completed: {len(results)} predictions")
    return jsonify({
        'count': len(results),
        'predictions': results,
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@app.route('/feature-importance', methods=['GET'])
@handle_errors
def feature_importance():
    """Get feature importance from the model"""
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    importance = predictor.get_feature_importance()
    return jsonify(importance), 200

@app.route('/model-info', methods=['GET'])
@handle_errors
def model_info():
    """Get model information and statistics"""
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    info = predictor.get_model_info()
    return jsonify(info), 200

@app.route('/explain', methods=['POST'])
@handle_errors
def explain_prediction():
    """
    Get explanation for a prediction using SHAP/LIME
    
    Expected JSON:
    {
        "age": 45,
        "gender": 1,
        ...
    }
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    data = request.get_json()
    if not data:
        raise ValueError("Request body must be JSON")
    
    validate_prediction_input(data)
    
    explanation = predictor.explain_prediction(data)
    return jsonify(explanation), 200

@app.route('/validate', methods=['POST'])
@handle_errors
def validate_input():
    """Validate input data without making a prediction"""
    data = request.get_json()
    if not data:
        raise ValueError("Request body must be JSON")
    
    validate_prediction_input(data)
    
    return jsonify({
        'valid': True,
        'message': 'Input data is valid'
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found', 'type': 'not_found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({'error': 'Method not allowed', 'type': 'method_not_allowed'}), 405

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=port)
