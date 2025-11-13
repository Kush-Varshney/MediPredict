"""
Comprehensive training script for MediPredict
Trains multiple ML models on Kaggle health datasets with full evaluation and visualization
Supports: Heart Disease, Stroke, Parkinson's, and Diseases and Symptoms datasets
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.linear_model import SGDClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import joblib
import json

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from preprocessing.data_loader import DataLoader
from models.evaluator import ModelEvaluator

def load_kaggle_data():
    """
    Load data from Kaggle datasets
    Tries to load multiple datasets and combine them, or use the best available
    """
    data_dir = Path(__file__).parent / 'data'
    
    if not data_dir.exists():
        print("\n" + "="*60)
        print("ERROR: Dataset not found!")
        print("="*60)
        print("\nPlease run: python setup_kaggle_dataset.py")
        print("\nThis will download the Kaggle datasets for you.")
        print("="*60 + "\n")
        return None, None, None
    
    csv_files = list(data_dir.glob('*.csv'))
    
    if not csv_files:
        print(f"No CSV files found in {data_dir}")
        return None, None, None
    
    loader = DataLoader()
    all_X = []
    all_y = []
    
    # Try to load multiple datasets
    print(f"\nFound {len(csv_files)} dataset file(s). Loading...")
    
    for dataset_path in csv_files:
        try:
            print(f"  Attempting to load: {dataset_path.name}")
            X, y = None, None
            
            # Try specific loaders first
            if 'disease' in dataset_path.name.lower() or 'symptom' in dataset_path.name.lower():
                X, y = loader.load_diseases_symptoms_data(str(dataset_path))
                if X is not None:
                    print(f"    ✓ Loaded as Diseases and Symptoms dataset")
            elif 'heart' in dataset_path.name.lower():
                X, y = loader.load_heart_disease_data(str(dataset_path))
                if X is not None:
                    print(f"    ✓ Loaded as Heart Disease dataset")
            elif 'stroke' in dataset_path.name.lower():
                X, y = loader.load_stroke_data(str(dataset_path))
                if X is not None:
                    print(f"    ✓ Loaded as Stroke dataset")
            elif 'parkinson' in dataset_path.name.lower():
                X, y = loader.load_parkinsons_data(str(dataset_path))
                if X is not None:
                    print(f"    ✓ Loaded as Parkinson's dataset")
            else:
                # Generic loader
                X, y = loader.load_kaggle_dataset(str(dataset_path))
                if X is not None:
                    print(f"    ✓ Loaded using generic loader")
            
            if X is not None and y is not None:
                all_X.append(X)
                all_y.append(y)
                print(f"    Shape: {X.shape}, Classes: {len(np.unique(y))}")
        except Exception as e:
            print(f"    ✗ Error loading {dataset_path.name}: {e}")
            continue
    
    if not all_X:
        print("\n✗ No datasets could be loaded successfully")
        return None, None, None
    
    # Combine datasets if multiple loaded
    if len(all_X) > 1:
        print(f"\nCombining {len(all_X)} datasets...")
        # For now, use the largest dataset
        sizes = [len(X) for X in all_X]
        largest_idx = np.argmax(sizes)
        X = all_X[largest_idx]
        y = all_y[largest_idx]
        print(f"Using largest dataset: {X.shape}")
    else:
        X = all_X[0]
        y = all_y[0]
    
    return X, y, loader

def train_models():
    """Train all models on Kaggle dataset"""
    print("\n" + "="*60)
    print("MEDIPREDICT - MODEL TRAINING")
    print("="*60)
    
    # Skip retraining if artifacts are newer than dataset (unless forced)
    try:
        from pathlib import Path as _Path
        import os as _os
        force = _os.getenv('FORCE_RETRAIN', '0') == '1'
        data_dir = _Path(__file__).parent / 'data'
        models_dir = _Path(__file__).parent / 'models'
        if not force and data_dir.exists() and models_dir.exists():
            csv_files = list(data_dir.glob('*.csv'))
            if csv_files:
                newest_data_mtime = max(f.stat().st_mtime for f in csv_files)
                model_path = models_dir / 'model.pkl'
                results_path = models_dir / 'results.json'
                if model_path.exists():
                    model_mtime = model_path.stat().st_mtime
                    # If model is newer than data, skip retrain
                    if model_mtime >= newest_data_mtime:
                        print("\nArtifacts are up-to-date with dataset. Skipping retraining. Set FORCE_RETRAIN=1 to override.")
                        return
    except Exception:
        # Non-fatal: proceed with training if any error
        pass
    
    # Fast dummy training path for constrained environments
    if os.getenv('DUMMY_TRAIN', '0') == '1':
        print("\nDUMMY_TRAIN enabled: training a small synthetic model...")
        from sklearn.tree import DecisionTreeClassifier as _DT
        X = np.random.rand(500, 7)
        y = np.random.randint(0, 4, size=500)
        loader = DataLoader()
        X_processed = X  # already numeric
        dt = _DT(max_depth=5, random_state=42)
        dt.fit(X_processed, y)
        models_dir = Path(__file__).parent / 'models'
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump(dt, str(models_dir / 'model.pkl'))
        joblib.dump(None, str(models_dir / 'scaler.pkl'))
        joblib.dump({}, str(models_dir / 'label_encoders.pkl'))
        with open(models_dir / 'results.json', 'w') as f:
            json.dump({"dummy": True, "model": "DecisionTreeClassifier"}, f, indent=2)
        print("Synthetic model saved under ml/models/")
        print("="*60 + "\n")
        return

    # Load data
    print("\nLoading data...")
    X, y, loader = load_kaggle_data()
    
    if X is None or y is None:
        print("\nNo dataset available. Falling back to a small synthetic model so the service can run.")
        from sklearn.tree import DecisionTreeClassifier as _DT
        X = np.random.rand(500, 7)
        y = np.random.randint(0, 4, size=500)
        loader = DataLoader()
        X_processed = X  # already numeric
        dt = _DT(max_depth=5, random_state=42)
        dt.fit(X_processed, y)
        models_dir = Path(__file__).parent / 'models'
        os.makedirs(models_dir, exist_ok=True)
        joblib.dump(dt, str(models_dir / 'model.pkl'))
        joblib.dump(None, str(models_dir / 'scaler.pkl'))
        joblib.dump({}, str(models_dir / 'label_encoders.pkl'))
        with open(models_dir / 'results.json', 'w') as f:
            json.dump({"dummy": True, "model": "DecisionTreeClassifier", "reason": "no_dataset_found"}, f, indent=2)
        print("Synthetic model saved under ml/models/")
        print("="*60 + "\n")
        return
    
    print(f"Dataset shape: {X.shape}")
    print(f"Target distribution: {np.bincount(y)}")
    
    # Default to fast training unless explicitly disabled by setting FAST_TRAIN=0
    if os.getenv('FAST_TRAIN', '') == '':
        os.environ['FAST_TRAIN'] = '1'
    # When using FAST_TRAIN and no explicit TRAIN_ROWS is set, cap rows for speed
    if os.getenv('FAST_TRAIN') == '1' and not os.getenv('TRAIN_ROWS'):
        os.environ['TRAIN_ROWS'] = '20000'
    # Skip slower models by default in fast mode unless user explicitly overrides
    if os.getenv('FAST_TRAIN') == '1':
        os.environ.setdefault('SKIP_RF', '1')
        os.environ.setdefault('SKIP_GB', '1')
        os.environ.setdefault('SKIP_LOGREG', '1')
        os.environ.setdefault('SKIP_DT', '1')
        os.environ.setdefault('ET_TREES', '100')
    
    # Optional row cap or fast training on large datasets
    fast = os.getenv('FAST_TRAIN', '0') == '1'
    cap_rows_env = os.getenv('TRAIN_ROWS')
    cap_rows = None
    if cap_rows_env:
        try:
            cap_rows = int(cap_rows_env)
        except Exception:
            cap_rows = None
    if (fast and len(y) > 10000) or (cap_rows is not None and len(y) > cap_rows):
        try:
            # Stratified subsample to ~10000 rows
            desired = cap_rows if cap_rows is not None else 10000
            frac = min(1.0, desired / float(len(y)))
            # Use train_test_split to get a stratified subset
            X_sub, _, y_sub, _ = train_test_split(
                X, y, train_size=frac, random_state=42, stratify=y
            )
            X, y = X_sub, y_sub
            print(f"Sampling enabled: using subset shape {X.shape}")
        except Exception as sub_e:
            print(f"FAST_TRAIN sampling failed: {sub_e}")
    
    # Preprocess
    print("\nPreprocessing data...")
    # Use the same loader to preserve target label encoder if present
    X_processed = loader.preprocess_features(X, y, fit=True)
    
    # Remove rare classes that cannot be stratified (fewer than 2 samples)
    try:
        import numpy as _np
        import pandas as _pd
        y_series = _pd.Series(y)
        counts = y_series.value_counts()
        valid_classes = counts[counts >= 2].index
        valid_idx = y_series.isin(valid_classes).to_numpy()
        if hasattr(X_processed, 'shape') and len(X_processed) == len(y):
            X_processed = X_processed[valid_idx]
            y = y[valid_idx]
        print(f"Filtered classes <2 samples; new shape: {X_processed.shape}")
    except Exception as _:
        pass

    # Split data
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_processed, y, test_size=0.2, random_state=42, stratify=y
    )
    
    models = {}
    results = {}
    
    print("\nTraining models...")
    
    # Decision Tree
    skip_dt = os.getenv('SKIP_DT', '0') == '1'
    if not skip_dt:
        print("  • Training Decision Tree...")
        dt = DecisionTreeClassifier(max_depth=10, random_state=42)
        dt.fit(X_train, y_train)
        models['decision_tree'] = dt
    
    # Random Forest
    skip_rf = os.getenv('SKIP_RF', '0') == '1'
    if not skip_rf:
        print("  • Training Random Forest...")
        rf_trees_env = os.getenv('RF_TREES')
        rf_estimators = int(rf_trees_env) if rf_trees_env else (100 if not fast else 60)
        rf = RandomForestClassifier(n_estimators=rf_estimators, max_depth=15, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        models['random_forest'] = rf

    # Extra Trees (very fast, good baseline)
    skip_et = os.getenv('SKIP_ET', '0') == '1'
    if not skip_et:
        print("  • Training Extra Trees...")
        et_trees_env = os.getenv('ET_TREES')
        et_estimators = int(et_trees_env) if et_trees_env else (200 if not fast else 100)
        et = ExtraTreesClassifier(n_estimators=et_estimators, random_state=42, n_jobs=-1)
        et.fit(X_train, y_train)
        models['extra_trees'] = et
    
    # Optional Logistic Regression (can be slow on very large datasets)
    skip_logreg = os.getenv('SKIP_LOGREG', '0') == '1'
    use_logreg = (os.getenv('USE_LOGREG', '1') == '1') and not skip_logreg
    if use_logreg:
        print("  • Training Logistic Regression...")
        # saga handles multinomial + l1/l2; faster for large/sparse
        lr_max_iter_env = os.getenv('LR_MAX_ITER')
        lr_max_iter = int(lr_max_iter_env) if lr_max_iter_env else (200 if not fast else 120)
        solver = os.getenv('LR_SOLVER', 'saga')
        # some sklearn versions do not support n_jobs on LogisticRegression; guard it
        lr_kwargs = dict(max_iter=lr_max_iter, multi_class='auto', solver=solver, n_jobs=-1 if solver != 'lbfgs' else None)
        try:
            # only set n_jobs if supported by installed version
            _ = LogisticRegression().get_params()
            if solver != 'lbfgs':
                lr_kwargs['n_jobs'] = -1
        except Exception:
            pass
        logreg = LogisticRegression(**lr_kwargs)
        try:
            logreg.fit(X_train, y_train)
            models['logistic_regression'] = logreg
        except Exception as e:
            print(f"    Skipping Logistic Regression due to error: {e}")

    # Optional very fast linear model (SGD)
    use_sgd = os.getenv('USE_SGD', '0') == '1'
    if use_sgd:
        print("  • Training SGDClassifier (linear model)...")
        sgd_max_iter_env = os.getenv('SGD_MAX_ITER')
        sgd_max_iter = int(sgd_max_iter_env) if sgd_max_iter_env else (1000 if not fast else 400)
        sgd_loss = os.getenv('SGD_LOSS', 'log_loss')  # 'hinge' or 'log_loss'
        sgd = SGDClassifier(loss=sgd_loss, max_iter=sgd_max_iter, n_jobs=-1, random_state=42)
        try:
            sgd.fit(X_train, y_train)
            models['sgd_classifier'] = sgd
        except Exception as e:
            print(f"    Skipping SGDClassifier due to error: {e}")
    
    # SVM (fast configuration when enabled)
    disable_svm = os.getenv('DISABLE_SVM', '1') == '1'
    if not disable_svm:
        print("  • Training SVM...")
        # Use linear kernel for speed; enable probability to support soft voting
        svm_subset = int(os.getenv('SVM_TRAIN_ROWS', '6000'))
        X_svm, y_svm = X_train, y_train
        if fast and len(y_train) > svm_subset:
            X_svm, _, y_svm, _ = train_test_split(X_train, y_train, train_size=svm_subset, random_state=42, stratify=y_train)
            print(f"    SVM: using subset {X_svm.shape}")
        svm_kernel = os.getenv('SVM_KERNEL', 'linear')
        svm = SVC(kernel=svm_kernel, probability=True, random_state=42)
        try:
            svm.fit(X_svm, y_svm)
            models['svm'] = svm
        except Exception as e:
            print(f"    Skipping SVM due to error/timeout: {e}")
    
    # Gradient Boosting
    skip_gb = os.getenv('SKIP_GB', '0') == '1'
    if not skip_gb:
        print("  • Training Gradient Boosting...")
        gb_trees_env = os.getenv('GB_TREES')
        gb_estimators = int(gb_trees_env) if gb_trees_env else (100 if not fast else 60)
        gb = GradientBoostingClassifier(n_estimators=gb_estimators, learning_rate=0.1, random_state=42)
        gb.fit(X_train, y_train)
        models['gradient_boosting'] = gb
    
    # Optional soft voting ensemble when multiple probabilistic models are available
    use_ensemble = os.getenv('USE_ENSEMBLE', '1') == '1'
    if use_ensemble:
        try:
            voters = []
            for name, mdl in models.items():
                if hasattr(mdl, 'predict_proba'):
                    voters.append((name, mdl))
            if len(voters) >= 2:
                print("  • Building Soft Voting Ensemble...")
                ensemble = VotingClassifier(estimators=voters, voting='soft', n_jobs=-1)
                ensemble.fit(X_train, y_train)
                models['ensemble_soft'] = ensemble
        except Exception as e:
            print(f"    Skipping ensemble due to error: {e}")

    # Evaluate models with comprehensive evaluator
    print("\n" + "="*60)
    print("EVALUATING MODELS")
    print("="*60)
    
    evaluator = ModelEvaluator(output_dir=str(Path(__file__).parent / 'models' / 'evaluations'))
    
    # Get feature names for SHAP/LIME
    feature_names = None
    if isinstance(X_train, pd.DataFrame):
        feature_names = list(X_train.columns)
    elif hasattr(loader, 'feature_names'):
        feature_names = loader.feature_names
    
    for name, model in models.items():
        print(f"\nEvaluating {name}...")
        try:
            metrics = evaluator.evaluate_model(model, X_test, y_test, name, y_train)
            results[name] = metrics
            
            # Try SHAP and LIME explanations (optional, may fail)
            if os.getenv('ENABLE_SHAP', '0') == '1':
                try:
                    evaluator.explain_with_shap(model, X_test[:50], feature_names, name)
                except Exception:
                    pass
            
            if os.getenv('ENABLE_LIME', '0') == '1':
                try:
                    evaluator.explain_with_lime(model, X_test[:10], feature_names, name)
                except Exception:
                    pass
        except Exception as e:
            print(f"  ⚠ Evaluation error: {e}")
            # Fallback to basic metrics
            y_pred = model.predict(X_test)
            results[name] = {
                'accuracy': float(accuracy_score(y_test, y_pred)),
                'precision': float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
                'recall': float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
                'f1_score': float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
                'roc_auc': 0.0,
                'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
            }
    
    # Generate comparison visualizations
    print("\nGenerating comparison visualizations...")
    evaluator.plot_model_comparison()
    evaluator.save_results()
    evaluator.print_summary()
    
    # Save best model
    best_model_name = max(results, key=lambda x: results[x]['f1_score'])
    best_model = models[best_model_name]
    
    models_dir = Path(__file__).parent / 'models'
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(best_model, str(models_dir / 'model.pkl'))
    joblib.dump(loader.scaler, str(models_dir / 'scaler.pkl'))
    joblib.dump(loader.label_encoders, str(models_dir / 'label_encoders.pkl'))
    
    # Save symptom vocabulary if training on disease/symptom matrix
    try:
        symptom_vocab = []
        if isinstance(X, pd.DataFrame):
            symptom_vocab = list(X.columns)
        elif hasattr(loader, 'symptom_columns'):
            try:
                cols = getattr(loader, 'symptom_columns')
                if isinstance(cols, (list, tuple)):
                    symptom_vocab = list(cols)
            except Exception:
                symptom_vocab = []
        if symptom_vocab:
            with open(models_dir / 'symptom_vocabulary.json', 'w') as f:
                json.dump(symptom_vocab, f, indent=2)
    except Exception as _:
        pass
    
    # Save results
    with open(models_dir / 'results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "="*60)
    print(f"✓ Best model: {best_model_name}")
    print(f"✓ Model saved to models/model.pkl")
    print(f"✓ Scaler saved to models/scaler.pkl")
    print(f"✓ Label encoders saved to models/label_encoders.pkl")
    print(f"✓ Results saved to models/results.json")
    print("="*60 + "\n")

if __name__ == '__main__':
    train_models()
