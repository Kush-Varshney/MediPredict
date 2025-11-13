"""
Comprehensive model evaluation and visualization module
Includes metrics, confusion matrices, ROC curves, and SHAP/LIME explanations
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
)
from pathlib import Path
import json
import warnings
warnings.filterwarnings('ignore')

class ModelEvaluator:
    """Comprehensive model evaluation with visualizations"""
    
    def __init__(self, output_dir='models/evaluations'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.results = {}
        
    def evaluate_model(self, model, X_test, y_test, model_name, y_train=None):
        """
        Comprehensive model evaluation
        
        Args:
            model: Trained model
            X_test: Test features
            y_test: Test labels
            model_name: Name of the model
            y_train: Training labels (optional, for class distribution)
        """
        # Predictions
        y_pred = model.predict(X_test)
        
        # Probabilities (if available)
        y_pred_proba = None
        if hasattr(model, 'predict_proba'):
            try:
                y_pred_proba = model.predict_proba(X_test)
            except Exception:
                pass
        
        # Calculate metrics
        metrics = {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
        }
        
        # ROC-AUC (for binary and multiclass)
        try:
            if y_pred_proba is not None:
                if len(np.unique(y_test)) == 2:
                    # Binary classification
                    metrics['roc_auc'] = float(roc_auc_score(y_test, y_pred_proba[:, 1]))
                else:
                    # Multiclass classification
                    metrics['roc_auc'] = float(roc_auc_score(
                        y_test, y_pred_proba, 
                        average='weighted', 
                        multi_class='ovr'
                    ))
            else:
                metrics['roc_auc'] = 0.0
        except Exception:
            metrics['roc_auc'] = 0.0
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        metrics['confusion_matrix'] = cm.tolist()
        
        # Classification report
        try:
            report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            metrics['classification_report'] = report
        except Exception:
            metrics['classification_report'] = {}
        
        self.results[model_name] = metrics
        
        # Generate visualizations
        self._plot_confusion_matrix(cm, model_name, y_test)
        if y_pred_proba is not None:
            self._plot_roc_curve(y_test, y_pred_proba, model_name)
            self._plot_precision_recall_curve(y_test, y_pred_proba, model_name)
        
        return metrics
    
    def _plot_confusion_matrix(self, cm, model_name, y_test):
        """Plot confusion matrix heatmap"""
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            cm, 
            annot=True, 
            fmt='d', 
            cmap='Blues',
            xticklabels=sorted(np.unique(y_test)),
            yticklabels=sorted(np.unique(y_test))
        )
        plt.title(f'Confusion Matrix - {model_name}', fontsize=14, fontweight='bold')
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        plt.tight_layout()
        
        filename = self.output_dir / f'{model_name}_confusion_matrix.png'
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"  ✓ Saved confusion matrix: {filename}")
    
    def _plot_roc_curve(self, y_test, y_pred_proba, model_name):
        """Plot ROC curve(s)"""
        plt.figure(figsize=(10, 8))
        
        if len(np.unique(y_test)) == 2:
            # Binary classification
            fpr, tpr, _ = roc_curve(y_test, y_pred_proba[:, 1])
            roc_auc = roc_auc_score(y_test, y_pred_proba[:, 1])
            plt.plot(fpr, tpr, label=f'ROC curve (AUC = {roc_auc:.2f})', linewidth=2)
        else:
            # Multiclass classification
            n_classes = len(np.unique(y_test))
            for i in range(n_classes):
                y_binary = (y_test == i).astype(int)
                if len(np.unique(y_binary)) > 1:
                    fpr, tpr, _ = roc_curve(y_binary, y_pred_proba[:, i])
                    roc_auc = roc_auc_score(y_binary, y_pred_proba[:, i])
                    plt.plot(fpr, tpr, label=f'Class {i} (AUC = {roc_auc:.2f})', linewidth=2)
        
        plt.plot([0, 1], [0, 1], 'k--', label='Random', linewidth=1)
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate', fontsize=12)
        plt.ylabel('True Positive Rate', fontsize=12)
        plt.title(f'ROC Curve - {model_name}', fontsize=14, fontweight='bold')
        plt.legend(loc="lower right", fontsize=10)
        plt.grid(alpha=0.3)
        plt.tight_layout()
        
        filename = self.output_dir / f'{model_name}_roc_curve.png'
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"  ✓ Saved ROC curve: {filename}")
    
    def _plot_precision_recall_curve(self, y_test, y_pred_proba, model_name):
        """Plot Precision-Recall curve"""
        plt.figure(figsize=(10, 8))
        
        if len(np.unique(y_test)) == 2:
            # Binary classification
            precision, recall, _ = precision_recall_curve(y_test, y_pred_proba[:, 1])
            plt.plot(recall, precision, label='Precision-Recall curve', linewidth=2)
        else:
            # Multiclass - plot for each class
            n_classes = len(np.unique(y_test))
            for i in range(n_classes):
                y_binary = (y_test == i).astype(int)
                if len(np.unique(y_binary)) > 1:
                    precision, recall, _ = precision_recall_curve(y_binary, y_pred_proba[:, i])
                    plt.plot(recall, precision, label=f'Class {i}', linewidth=2)
        
        plt.xlabel('Recall', fontsize=12)
        plt.ylabel('Precision', fontsize=12)
        plt.title(f'Precision-Recall Curve - {model_name}', fontsize=14, fontweight='bold')
        plt.legend(loc="lower left", fontsize=10)
        plt.grid(alpha=0.3)
        plt.tight_layout()
        
        filename = self.output_dir / f'{model_name}_precision_recall.png'
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"  ✓ Saved Precision-Recall curve: {filename}")
    
    def plot_model_comparison(self):
        """Create comparison heatmap of all models"""
        if not self.results:
            return
        
        models = list(self.results.keys())
        metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']
        
        comparison_data = []
        for model in models:
            row = [self.results[model].get(metric, 0) for metric in metrics]
            comparison_data.append(row)
        
        comparison_array = np.array(comparison_data)
        
        plt.figure(figsize=(12, 8))
        sns.heatmap(
            comparison_array,
            annot=True,
            fmt='.3f',
            cmap='YlOrRd',
            xticklabels=metrics,
            yticklabels=models,
            cbar_kws={'label': 'Score'}
        )
        plt.title('Model Comparison - Performance Metrics', fontsize=14, fontweight='bold')
        plt.ylabel('Model', fontsize=12)
        plt.xlabel('Metric', fontsize=12)
        plt.tight_layout()
        
        filename = self.output_dir / 'model_comparison_heatmap.png'
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"  ✓ Saved model comparison: {filename}")
    
    def explain_with_shap(self, model, X_sample, feature_names=None, model_name='model'):
        """
        Generate SHAP explanations (if available)
        
        Args:
            model: Trained model
            X_sample: Sample data for explanation
            feature_names: Names of features
            model_name: Name of the model
        """
        try:
            import shap
            
            # Limit sample size for performance
            if len(X_sample) > 100:
                X_sample = X_sample[:100]
            
            # Create explainer based on model type
            if hasattr(model, 'predict_proba'):
                explainer = shap.TreeExplainer(model) if hasattr(model, 'tree_') else shap.KernelExplainer(model.predict_proba, X_sample[:50])
            else:
                explainer = shap.KernelExplainer(model.predict, X_sample[:50])
            
            shap_values = explainer.shap_values(X_sample)
            
            # Plot summary
            plt.figure(figsize=(10, 8))
            shap.summary_plot(shap_values, X_sample, feature_names=feature_names, show=False)
            plt.tight_layout()
            
            filename = self.output_dir / f'{model_name}_shap_summary.png'
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            plt.close()
            print(f"  ✓ Saved SHAP summary: {filename}")
            
            return True
        except ImportError:
            print("  ⚠ SHAP not available, skipping SHAP explanations")
            return False
        except Exception as e:
            print(f"  ⚠ SHAP explanation failed: {e}")
            return False
    
    def explain_with_lime(self, model, X_sample, feature_names=None, model_name='model'):
        """
        Generate LIME explanations (if available)
        
        Args:
            model: Trained model
            X_sample: Sample data for explanation
            feature_names: Names of features
            model_name: Name of the model
        """
        try:
            from lime import lime_tabular
            
            # Use first sample for explanation
            if len(X_sample) == 0:
                return False
            
            explainer = lime_tabular.LimeTabularExplainer(
                X_sample,
                feature_names=feature_names,
                mode='classification'
            )
            
            # Explain first instance
            explanation = explainer.explain_instance(
                X_sample[0],
                model.predict_proba if hasattr(model, 'predict_proba') else model.predict,
                num_features=min(10, X_sample.shape[1])
            )
            
            # Save explanation as image
            fig = explanation.as_pyplot_figure()
            filename = self.output_dir / f'{model_name}_lime_explanation.png'
            fig.savefig(filename, dpi=300, bbox_inches='tight')
            plt.close(fig)
            print(f"  ✓ Saved LIME explanation: {filename}")
            
            return True
        except ImportError:
            print("  ⚠ LIME not available, skipping LIME explanations")
            return False
        except Exception as e:
            print(f"  ⚠ LIME explanation failed: {e}")
            return False
    
    def save_results(self, filename='evaluation_results.json'):
        """Save evaluation results to JSON"""
        filepath = self.output_dir / filename
        with open(filepath, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"  ✓ Saved evaluation results: {filepath}")
    
    def print_summary(self):
        """Print summary of all evaluations"""
        print("\n" + "="*60)
        print("MODEL EVALUATION SUMMARY")
        print("="*60)
        
        for model_name, metrics in self.results.items():
            print(f"\n{model_name.upper()}:")
            print(f"  Accuracy:  {metrics['accuracy']:.4f}")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall:    {metrics['recall']:.4f}")
            print(f"  F1-Score:  {metrics['f1_score']:.4f}")
            print(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")
        
        print("\n" + "="*60)

