import joblib
import numpy as np
import random
from typing import Dict, Any, List
from middleware.inference_logger import log_inference
from utils.fallback import FallbackManager

class ServiceTimePredictor:
    def __init__(self, model_path='models/service_time_v1.pkl'):
        # In a real scenario, we would load the trained model
        # self.model = joblib.load(model_path)
        self.version = 'v1.0'
        self.is_ready = True
        self.fallback_manager = FallbackManager()
    
    @log_inference(model_name="service_time_predictor", model_version="v1.0")
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        return self.fallback_manager.execute(
            self._predict_model,
            self._predict_fallback,
            features
        )

    def _predict_model(self, features: Dict[str, Any]):
        """
        features = {
            'customer_avg_service_time': 5.2,
            'order_weight_kg': 15.0,
            'order_volume_m3': 0.5,
            'order_items': 3,
            'stop_type': 'delivery',
            'hour_of_day': 14,
            'day_of_week': 2
        }
        """
        # Mock prediction logic for demonstration
        # Base time + varied by items and weight
        base_time = features.get('customer_avg_service_time', 10.0)
        items = features.get('order_items', 1)
        weight = features.get('order_weight_kg', 5.0)
        
        predicted_min = base_time + (items * 1.5) + (weight * 0.1)
        
        # Add some randomness
        predicted_min += random.uniform(-1.0, 1.0)
        predicted_min = max(2.0, predicted_min) # Minimum 2 mins
        
        # Confidence interval
        lower = predicted_min * 0.85
        upper = predicted_min * 1.15
        
        return {
            'predicted_minutes': round(predicted_min, 1),
            'confidence_interval': [round(lower, 1), round(upper, 1)],
            'model_version': self.version,
            'source': 'model'
        }

    def _predict_fallback(self, features: Dict[str, Any]):
        """Simple rule-based calculation when model fails"""
        # Very conservative estimate
        items = features.get('order_items', 1)
        base_calc = 5.0 + (items * 2.0) # 5 mins base + 2 mins per item
        
        return {
            'predicted_minutes': round(base_calc, 1),
            'confidence_interval': [round(base_calc * 0.8, 1), round(base_calc * 1.2, 1)],
            'model_version': 'fallback',
            'source': 'fallback'
        }

    def train(self):
        # Mock training process
        return {
            "mae": 1.2,
            "mse": 2.5,
            "r2": 0.85,
            "samples": 5000
        }
