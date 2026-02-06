"""
Train all AI models using historical data
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.eta_predictor import ETAPredictor
from models.anomaly_detector import AnomalyDetector
from models.fraud_detector import FraudDetector

def main():
    print("🚀 Training all AI models...\n")
    
    # Train ETA Predictor
    print("=" * 60)
    print("1️⃣  Training ETA Prediction Model")
    print("=" * 60)
    eta_predictor = ETAPredictor()
    eta_metrics = eta_predictor.train()
    print(f"✅ ETA Model trained successfully!")
    print(f"   Metrics: {eta_metrics}\n")
    
    # Train Anomaly Detector
    print("=" * 60)
    print("2️⃣  Training Anomaly Detection Model")
    print("=" * 60)
    anomaly_detector = AnomalyDetector()
    anomaly_metrics = anomaly_detector.train()
    print(f"✅ Anomaly Detection Model trained successfully!")
    print(f"   Metrics: {anomaly_metrics}\n")
    
    # Train Fraud Detector
    print("=" * 60)
    print("3️⃣  Training POD Fraud Detection Model")
    print("=" * 60)
    fraud_detector = FraudDetector()
    fraud_metrics = fraud_detector.train()
    print(f"✅ Fraud Detection Model trained successfully!")
    print(f"   Metrics: {fraud_metrics}\n")
    
    print("=" * 60)
    print("🎉 All models trained successfully!")
    print("=" * 60)
    print("\nSummary:")
    print(f"  - ETA Predictor: MAE={eta_metrics['mae']:.2f} min, R²={eta_metrics['r2']:.4f}")
    print(f"  - Anomaly Detector: {anomaly_metrics['samples']} samples")
    print(f"  - Fraud Detector: AUC={fraud_metrics['auc']:.4f}")
    print("\nModels are ready to use! 🚀")

if __name__ == "__main__":
    main()
