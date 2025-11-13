import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import joblib

class ModelTrainer:
    """Train and evaluate ML models"""
    
    def __init__(self):
        self.models = {}
        self.results = {}
    
    def train_decision_tree(self, X_train, y_train):
        """Train Decision Tree model"""
        model = DecisionTreeClassifier(max_depth=10, random_state=42)
        model.fit(X_train, y_train)
        self.models['decision_tree'] = model
        return model
    
    def train_random_forest(self, X_train, y_train):
        """Train Random Forest model"""
        model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42)
        model.fit(X_train, y_train)
        self.models['random_forest'] = model
        return model
    
    def train_svm(self, X_train, y_train):
        """Train SVM model"""
        model = SVC(kernel='rbf', probability=True, random_state=42)
        model.fit(X_train, y_train)
        self.models['svm'] = model
        return model
    
    def train_gradient_boosting(self, X_train, y_train):
        """Train Gradient Boosting model"""
        model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, random_state=42)
        model.fit(X_train, y_train)
        self.models['gradient_boosting'] = model
        return model
    
    def evaluate_model(self, model, X_test, y_test, model_name):
        """Evaluate model performance"""
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else y_pred
        
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='weighted'),
            'recall': recall_score(y_test, y_pred, average='weighted'),
            'f1_score': f1_score(y_test, y_pred, average='weighted'),
            'roc_auc': roc_auc_score(y_test, y_pred_proba, average='weighted') if len(np.unique(y_test)) > 1 else 0,
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }
        
        self.results[model_name] = metrics
        return metrics
    
    def get_best_model(self):
        """Get best performing model"""
        best_model_name = max(self.results, key=lambda x: self.results[x]['f1_score'])
        return best_model_name, self.models[best_model_name]
    
    def save_model(self, model, filepath):
        """Save model to disk"""
        joblib.dump(model, filepath)
    
    def load_model(self, filepath):
        """Load model from disk"""
        return joblib.load(filepath)
