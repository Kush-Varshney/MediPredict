import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

class DataLoader:
    """Load and preprocess health datasets"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
    
    def load_heart_disease_data(self, filepath):
        """Load heart disease dataset"""
        df = pd.read_csv(filepath)
        
        # Handle missing values
        df = df.dropna()
        
        # Separate features and target
        X = df.drop('target', axis=1)
        y = df['target']
        
        return X, y
    
    def load_stroke_data(self, filepath):
        """Load stroke prediction dataset"""
        df = pd.read_csv(filepath)
        
        # Handle missing values
        df['bmi'].fillna(df['bmi'].mean(), inplace=True)
        
        # Remove rows with missing target
        df = df.dropna(subset=['stroke'])
        
        X = df.drop(['stroke', 'id'], axis=1)
        y = df['stroke']
        
        return X, y
    
    def load_parkinsons_data(self, filepath):
        """Load Parkinson's dataset"""
        df = pd.read_csv(filepath)
        
        X = df.drop(['name', 'status'], axis=1)
        y = df['status']
        
        return X, y
    
    def load_diseases_symptoms_data(self, filepath):
        """
        Load Diseases and Symptoms Dataset from Kaggle
        This dataset contains disease-symptom relationships
        """
        nrows_env = None
        try:
            import os
            nrows_env = int(os.getenv('FAST_TRAIN_NROWS', '0'))
        except Exception:
            nrows_env = None
        df = pd.read_csv(filepath, nrows=(nrows_env if nrows_env and nrows_env > 0 else None))
        
        # Handle missing values
        df = df.dropna()
        
        # Encode disease column as target (support 'Disease' and 'diseases')
        target_col = None
        if 'Disease' in df.columns:
            target_col = 'Disease'
        elif 'diseases' in df.columns:
            target_col = 'diseases'

        if target_col is not None:
            self.label_encoders['disease'] = LabelEncoder()
            y = self.label_encoders['disease'].fit_transform(df[target_col])
            
            # Get symptom columns (all except Disease)
            X = df.drop(target_col, axis=1)
            
            # Normalize symptom indicators to binary (0/1)
            for col in X.columns:
                if X[col].dtype == 'object':
                    X[col] = X[col].astype(str).str.strip().str.lower()
                    X[col] = X[col].isin(['yes', '1', 'true']).astype(int)
                else:
                    # Treat any non-zero numeric as 1
                    X[col] = (X[col].astype(float) > 0).astype(int)
            
            return X, y
        
        return None, None
    
    def load_kaggle_dataset(self, filepath):
        """
        Load any Kaggle health dataset with flexible column mapping
        Automatically detects and processes health-related columns
        """
        nrows_env = None
        try:
            import os
            nrows_env = int(os.getenv('FAST_TRAIN_NROWS', '0'))
        except Exception:
            nrows_env = None
        df = pd.read_csv(filepath, nrows=(nrows_env if nrows_env and nrows_env > 0 else None))
        
        # Common target column names
        target_cols = ['Disease', 'disease', 'target', 'diagnosis', 'condition', 
                      'stroke', 'heart_disease', 'parkinsons']
        
        target_col = None
        for col in target_cols:
            if col in df.columns:
                target_col = col
                break
        
        if target_col is None:
            raise ValueError(f"No target column found. Expected one of: {target_cols}")
        
        # Remove rows with missing target
        df = df.dropna(subset=[target_col])
        
        # Separate features and target
        X = df.drop(target_col, axis=1)
        y = df[target_col]
        
        # Encode target if categorical
        if y.dtype == 'object':
            self.label_encoders['target'] = LabelEncoder()
            y = self.label_encoders['target'].fit_transform(y)
        
        return X, y
    
    def preprocess_features(self, X, y=None, fit=True):
        """
        Preprocess features: encoding, scaling, feature selection
        """
        X_processed = X.copy()
        
        # Encode categorical variables
        categorical_cols = X_processed.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if fit:
                self.label_encoders[col] = LabelEncoder()
                X_processed[col] = self.label_encoders[col].fit_transform(X_processed[col])
            else:
                X_processed[col] = self.label_encoders[col].transform(X_processed[col])
        
        # Scale numerical features
        if fit:
            X_processed = self.scaler.fit_transform(X_processed)
        else:
            X_processed = self.scaler.transform(X_processed)
        
        return X_processed
    
    def split_data(self, X, y, test_size=0.2, random_state=42):
        """Split data into train and test sets"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        return X_train, X_test, y_train, y_test
