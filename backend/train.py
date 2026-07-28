"""
NEXUS-AI Model Training Script
Executes PCA Eigenface transformation and ANN Multi-Layer Perceptron classifier training.
"""
import sys
import os

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml_pipeline import pipeline

def run_training():
    print("=" * 60)
    print("  NEXUS-AI FACE RECOGNITION: MODEL TRAINING ENGINE")
    print("  Algorithm: OpenCV Detection + PCA Eigenfaces + ANN (MLP)")
    print("=" * 60)
    
    print("\n[Step 1] Loading dataset & generating PCA feature space...")
    success = pipeline.retrain_model()
    
    if success:
        print("\n[Step 2] Model Training Summary:")
        print(f"  - PCA Principal Components: {pipeline.pca.n_components_}")
        print(f"  - PCA Explained Variance Ratio (Sum): {sum(pipeline.pca.explained_variance_ratio_)*100:.2f}%")
        print(f"  - ANN Hidden Layers: {pipeline.ann.hidden_layer_sizes}")
        print(f"  - ANN Iterations Completed: {pipeline.ann.n_iter_}")
        print(f"  - Registered Subjects: {len(pipeline.label_map)}")
        print("\n[Success] Trained models saved in 'models/' folder.")
    else:
        print("\n[Error] Model training failed.")

if __name__ == "__main__":
    run_training()
