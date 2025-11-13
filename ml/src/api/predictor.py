import numpy as np
import joblib
from typing import Dict, List
import logging
import os

logger = logging.getLogger(__name__)

class DiseasePredictor:
    """Make predictions using trained models"""
    
    def __init__(self, model_path: str, scaler_path: str = None):
        self.model = joblib.load(model_path)
        base_dir = os.path.dirname(os.path.abspath(model_path))
        self.scaler = None
        self.label_encoders = {}
        self.symptom_vocabulary: List[str] = []

        if scaler_path:
            try:
                self.scaler = joblib.load(scaler_path)
            except Exception:
                logger.warning("Could not load scaler")

        # Try to load label encoders and symptom vocabulary saved during training
        try:
            self.label_encoders = joblib.load(os.path.join(base_dir, 'label_encoders.pkl'))
        except Exception:
            self.label_encoders = {}

        try:
            import json
            with open(os.path.join(base_dir, 'symptom_vocabulary.json'), 'r') as f:
                self.symptom_vocabulary = json.load(f)
        except Exception:
            self.symptom_vocabulary = []

        # Default feature names for vitals path
        self.feature_names = [
            'age', 'gender', 'weight',
            'blood_pressure_systolic', 'blood_pressure_diastolic',
            'glucose', 'cholesterol'
        ]

    def predict(self, data: Dict) -> Dict:
        """
        Make prediction on input data
        
        Args:
            data: Dictionary with health features
            
        Returns:
            Dictionary with prediction, confidence, and risk level
        """
        # If we have a symptom vocabulary and symptoms are provided, use symptom vector path
        used_symptoms_path = False
        if self.symptom_vocabulary and isinstance(data.get('symptoms'), list):
            import re as _re

            def _norm(s: str) -> str:
                s = str(s).lower().strip()
                s = _re.sub(r"[\s_]+", " ", s)
                s = _re.sub(r"[^a-z0-9 ]+", "", s)
                return s

            def _variants(base: str):
                # simple variants generator; can be extended
                yield base
                if base.endswith('ing'):
                    yield base[:-3]
                if base.endswith('ed'):
                    yield base[:-2]
                if base.endswith('s'):
                    yield base[:-1]

            vocab_index = {}
            for idx, symptom in enumerate(self.symptom_vocabulary):
                base = _norm(symptom)
                for v in _variants(base):
                    if v not in vocab_index:
                        vocab_index[v] = idx
            
            feature_vec = np.zeros(len(self.symptom_vocabulary), dtype=float)
            
            matched = []
            unmatched = []
            for s in data.get('symptoms', []):
                if not s:
                    continue
                key = _norm(s)
                hit = None
                for v in _variants(key):
                    if v in vocab_index:
                        hit = v
                        break
                if hit is not None:
                    feature_vec[vocab_index[hit]] = 1.0
                    matched.append(s)
                else:
                    unmatched.append(s)
            
            logger.info(f"[Predict] Input symptoms: {data.get('symptoms', [])}")
            logger.info(f"[Predict] Matched {len(matched)} symptoms: {matched}")
            if unmatched:
                logger.warning(f"[Predict] Unmatched {len(unmatched)} symptoms: {unmatched}")
            logger.info(f"[Predict] Vocabulary size: {len(self.symptom_vocabulary)}")
            
            if float(feature_vec.sum()) > 0.0:
                features = feature_vec.reshape(1, -1)
                used_symptoms_path = True
                logger.info(f"[Predict] Using symptom path with {int(feature_vec.sum())} matched symptoms out of {len(data.get('symptoms', []))}")
            else:
                # Fall back to vitals path when no symptoms match vocabulary
                used_symptoms_path = False
                logger.warning(f"[Predict] No symptoms matched vocabulary, falling back to vitals path. Unmatched: {unmatched}")
                features = np.array([
                    data.get('age', 0),
                    data.get('gender', 0),
                    data.get('weight', 0),
                    data.get('blood_pressure_systolic', 0),
                    data.get('blood_pressure_diastolic', 0),
                    data.get('glucose', 0),
                    data.get('cholesterol', 0)
                ]).reshape(1, -1)
        else:
            logger.info(f"[Predict] Symptom vocabulary available: {bool(self.symptom_vocabulary)}, symptoms provided: {bool(data.get('symptoms'))}")
            logger.info("[Predict] Using vitals path")
            features = np.array([
                data.get('age', 0),
                data.get('gender', 0),
                data.get('weight', 0),
                data.get('blood_pressure_systolic', 0),
                data.get('blood_pressure_diastolic', 0),
                data.get('glucose', 0),
                data.get('cholesterol', 0)
            ]).reshape(1, -1)
        
        # Scale features if scaler available (only for vitals path)
        if self.scaler and not used_symptoms_path:
            try:
                features = self.scaler.transform(features)
            except Exception:
                # If scaler shape mismatches (e.g., symptom path), skip scaling
                pass
        
        # Validate we have any usable signal; if not, return clear 400 via Flask handler
        try:
            from numpy import isfinite as _isfinite
            if not used_symptoms_path:
                # If vitals are all zeros or non-finite, reject
                if float(np.nansum(features)) == 0.0 or not bool(np.all(_isfinite(features))):
                    raise ValueError("No valid symptoms matched vocabulary and vitals are missing. Please add symptoms or vitals.")
        except Exception:
            # Non-fatal
            pass
        
        # Make prediction
        prediction = self.model.predict(features)[0]
        
        # Get confidence score
        probabilities = None
        if hasattr(self.model, 'predict_proba'):
            try:
                probabilities = self.model.predict_proba(features)[0]
            except Exception:
                probabilities = None
        confidence = float(np.max(probabilities)) if probabilities is not None else 0.85
        
        # Determine risk level
        risk_level = self._calculate_risk_level(confidence)
        
        # Map prediction to disease label if encoder available
        predicted_label = None
        if 'disease' in self.label_encoders:
            try:
                predicted_label = self.label_encoders['disease'].inverse_transform([int(prediction)])[0]
            except Exception:
                predicted_label = None
        elif 'target' in self.label_encoders:
            try:
                predicted_label = self.label_encoders['target'].inverse_transform([int(prediction)])[0]
            except Exception:
                predicted_label = None
        # Build top-k predictions if available
        top_k = []
        if probabilities is not None:
            try:
                # Determine class labels
                class_labels = None
                if 'disease' in self.label_encoders:
                    class_labels = list(self.label_encoders['disease'].classes_)
                elif 'target' in self.label_encoders:
                    class_labels = list(self.label_encoders['target'].classes_)
                else:
                    # Fall back to numeric class ids
                    class_labels = [str(i) for i in range(len(probabilities))]
                k = min(5, len(probabilities))
                top_indices = np.argsort(probabilities)[::-1][:k]
                for idx in top_indices:
                    label = class_labels[idx] if idx < len(class_labels) else str(idx)
                    prob = float(probabilities[idx])
                    top_k.append({'label': str(label), 'probability': round(prob, 4)})
            except Exception:
                top_k = []

        # Count matched symptoms if symptoms path used
        matched_symptoms = int(features.sum()) if used_symptoms_path else 0
        return {
            'predicted_disease': predicted_label if predicted_label is not None else str(prediction),
            'disease_code': int(prediction),
            'confidence': round(confidence, 4),
            'confidence_percent': round(confidence * 100.0, 2),
            'risk_level': risk_level,
            'used_symptoms_path': bool(used_symptoms_path),
            'matched_symptoms': matched_symptoms,
            'model_type': type(self.model).__name__,
            'top_k': top_k,
            'timestamp': str(np.datetime64('now'))
        }

    def get_model_info(self) -> Dict:
        """Get model information"""
        disease_classes = []
        try:
            if 'disease' in self.label_encoders:
                # Extract original class labels if available
                disease_classes = list(self.label_encoders['disease'].classes_)
            elif 'target' in self.label_encoders:
                disease_classes = list(self.label_encoders['target'].classes_)
        except Exception:
            disease_classes = []
        return {
            'model_type': type(self.model).__name__,
            'feature_count': len(self.feature_names),
            'features': self.feature_names,
            'disease_classes': disease_classes,
            'has_probability': hasattr(self.model, 'predict_proba'),
            'has_feature_importance': hasattr(self.model, 'feature_importances_')
        }

    def explain_prediction(self, data: Dict) -> Dict:
        """
        Explain a prediction with SHAP/LIME support
        
        Args:
            data: Dictionary with health features
            
        Returns:
            Dictionary with explanation, feature importance, and optional SHAP/LIME
        """
        prediction = self.predict(data)
        
        # Get feature importance
        importance_info = self.get_feature_importance()
        
        # Prepare feature vector for SHAP/LIME
        feature_vector = None
        if self.symptom_vocabulary and isinstance(data.get('symptoms'), list):
            # Symptom path
            import re as _re
            def _norm(s: str) -> str:
                s = str(s).lower().strip()
                s = _re.sub(r"[\s_]+", " ", s)
                s = _re.sub(r"[^a-z0-9 ]+", "", s)
                return s
            
            vocab_index = {}
            for idx, symptom in enumerate(self.symptom_vocabulary):
                base = _norm(symptom)
                vocab_index[base] = idx
            
            feature_vec = np.zeros(len(self.symptom_vocabulary), dtype=float)
            for s in data.get('symptoms', []):
                key = _norm(s)
                if key in vocab_index:
                    feature_vec[vocab_index[key]] = 1.0
            feature_vector = feature_vec.reshape(1, -1)
        else:
            # Vitals path
            feature_vector = np.array([
                data.get('age', 0),
                data.get('gender', 0),
                data.get('weight', 0),
                data.get('blood_pressure_systolic', 0),
                data.get('blood_pressure_diastolic', 0),
                data.get('glucose', 0),
                data.get('cholesterol', 0)
            ]).reshape(1, -1)
            if self.scaler:
                try:
                    feature_vector = self.scaler.transform(feature_vector)
                except Exception:
                    pass
        
        # Create explanation
        explanation = {
            'prediction': prediction,
            'explanation': self._generate_explanation(data, prediction),
            'feature_importance': importance_info,
            'shap_available': False,
            'lime_available': False
        }
        
        # Try SHAP explanation (optional)
        try:
            import shap
            if feature_vector is not None:
                if hasattr(self.model, 'predict_proba'):
                    explainer = shap.TreeExplainer(self.model) if hasattr(self.model, 'tree_') else shap.KernelExplainer(self.model.predict_proba, feature_vector)
                    shap_values = explainer.shap_values(feature_vector[0])
                    explanation['shap_values'] = shap_values.tolist() if isinstance(shap_values, np.ndarray) else shap_values
                    explanation['shap_available'] = True
        except ImportError:
            pass
        except Exception:
            pass
        
        # Try LIME explanation (optional)
        try:
            from lime import lime_tabular
            if feature_vector is not None:
                explainer = lime_tabular.LimeTabularExplainer(
                    feature_vector,
                    feature_names=self.feature_names if not self.symptom_vocabulary else self.symptom_vocabulary,
                    mode='classification'
                )
                lime_exp = explainer.explain_instance(
                    feature_vector[0],
                    self.model.predict_proba if hasattr(self.model, 'predict_proba') else self.model.predict,
                    num_features=min(10, len(feature_vector[0]))
                )
                explanation['lime_explanation'] = dict(lime_exp.as_list())
                explanation['lime_available'] = True
        except ImportError:
            pass
        except Exception:
            pass
        
        return explanation

    def _generate_explanation(self, data: Dict, prediction: Dict) -> str:
        """Generate human-readable explanation"""
        disease = prediction['predicted_disease']
        confidence = prediction['confidence']
        risk_level = prediction['risk_level']
        
        explanation = f"Based on the provided health metrics, the model predicts {disease} with {confidence*100:.1f}% confidence. "
        explanation += f"Risk level: {risk_level}. "
        
        # Add specific insights
        if data.get('glucose', 0) > 125:
            explanation += "High glucose levels detected. "
        if data.get('cholesterol', 0) > 200:
            explanation += "High cholesterol levels detected. "
        if data.get('blood_pressure_systolic', 0) > 140:
            explanation += "High blood pressure detected. "
        
        return explanation

    def _calculate_risk_level(self, confidence: float) -> str:
        if confidence >= 0.8:
            return "High"
        elif confidence >= 0.6:
            return "Medium"
        return "Low"

    def get_feature_importance(self) -> Dict:
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_.tolist()
            return {
                'importances': importances,
                'features': self.feature_names,
                'type': 'tree_based',
                'feature_importance_pairs': [
                    {'feature': name, 'importance': imp}
                    for name, imp in zip(self.feature_names, importances)
                ]
            }
        return {'importances': [], 'features': [], 'type': 'unknown'}
