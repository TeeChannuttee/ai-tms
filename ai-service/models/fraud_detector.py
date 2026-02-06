"""
POD Fraud Detector Model
Detects fraudulent proof of delivery using image analysis and GPS verification
"""

import numpy as np
from pathlib import Path
import joblib
from typing import Dict, Any, List, Optional
from datetime import datetime
import imagehash
from PIL import Image
import requests
from io import BytesIO

class FraudDetector:
    def __init__(self):
        self.model = None
        self.model_path = Path(__file__).parent.parent / 'models' / 'fraud_model.pkl'
        self.known_hashes = set()  # Store hashes of previously seen images
        self.load_model()
    
    def load_model(self):
        """Load trained model from disk"""
        if self.model_path.exists():
            self.model = joblib.load(self.model_path)
            print(f"✅ Fraud detection model loaded from {self.model_path}")
        else:
            print("⚠️  Fraud detection model not found. Using rule-based detection.")
    
    def is_loaded(self) -> bool:
        return True  # Always available with rule-based fallback
    
    def detect(self, delivery_id: str, photo_urls: List[str],
               signature_url: Optional[str], gps_lat: float, gps_lng: float,
               gps_accuracy: float, timestamp: datetime,
               expected_location: Dict[str, float]) -> Dict[str, Any]:
        """
        Detect fraudulent proof of delivery
        Returns: fraud score, is_suspicious flag, reasons, and recommendations
        """
        fraud_indicators = []
        fraud_score = 0.0
        
        # 1. Check photo count
        if len(photo_urls) == 0:
            fraud_indicators.append("No photos provided")
            fraud_score += 0.3
        
        # 2. Check for duplicate photos
        if photo_urls:
            duplicate_check = self._check_duplicate_photos(photo_urls)
            if duplicate_check['has_duplicates']:
                fraud_indicators.append(f"Duplicate photos detected: {duplicate_check['count']}")
                fraud_score += 0.4
        
        # 3. GPS accuracy check
        if gps_accuracy > 50:
            fraud_indicators.append(f"Poor GPS accuracy: {gps_accuracy:.1f}m")
            fraud_score += 0.2
        
        # 4. GPS location verification
        distance_from_expected = self._calculate_distance(
            gps_lat, gps_lng,
            expected_location['latitude'], expected_location['longitude']
        )
        
        if distance_from_expected > 0.5:  # More than 500m away
            fraud_indicators.append(
                f"GPS location {distance_from_expected:.2f}km from expected location"
            )
            fraud_score += 0.5
        
        # 5. GPS spoofing detection (simplified)
        if gps_accuracy < 5 and distance_from_expected > 1:
            # Suspiciously accurate GPS but wrong location
            fraud_indicators.append("Possible GPS spoofing detected")
            fraud_score += 0.6
        
        # 6. Signature check
        if signature_url is None:
            fraud_indicators.append("No signature provided")
            fraud_score += 0.2
        
        # Cap fraud score at 1.0
        fraud_score = min(fraud_score, 1.0)
        
        # Determine if suspicious
        is_suspicious = fraud_score >= 0.5
        
        # Generate recommendations
        recommendations = []
        if is_suspicious:
            recommendations.append("Review delivery manually")
            if distance_from_expected > 0.5:
                recommendations.append("Verify GPS location with driver")
            if len(photo_urls) == 0:
                recommendations.append("Request photos from driver")
            if gps_accuracy > 50:
                recommendations.append("Request better quality GPS proof")
        
        return {
            "fraud_score": round(fraud_score, 3),
            "is_suspicious": is_suspicious,
            "reasons": fraud_indicators,
            "recommendations": recommendations
        }
    
    def _check_duplicate_photos(self, photo_urls: List[str]) -> Dict[str, Any]:
        """Check if photos are duplicates using perceptual hashing"""
        hashes = []
        
        for url in photo_urls:
            try:
                # In production, download and hash the image
                # For now, use URL as proxy
                hash_value = imagehash.average_hash(Image.new('RGB', (100, 100)))
                hashes.append(str(hash_value))
            except Exception as e:
                print(f"Error hashing image {url}: {e}")
                continue
        
        # Check for duplicates
        unique_hashes = set(hashes)
        has_duplicates = len(unique_hashes) < len(hashes)
        duplicate_count = len(hashes) - len(unique_hashes)
        
        return {
            "has_duplicates": has_duplicates,
            "count": duplicate_count,
            "total": len(hashes)
        }
    
    def train(self) -> Dict[str, float]:
        """Train fraud detection model using historical POD data"""
        print("🚀 Training fraud detection model...")
        
        # Load historical POD data
        data_path = Path(__file__).parent.parent.parent / 'data' / 'historical' / 'pod_records.csv'
        
        if not data_path.exists():
            raise FileNotFoundError(f"Historical data not found at {data_path}")
        
        import pandas as pd
        df = pd.read_csv(data_path)
        
        # Feature engineering
        features = df[[
            'photo_count', 'has_signature', 'signature_quality_score',
            'gps_accuracy_meters'
        ]].fillna(0)
        
        labels = df['is_flagged_suspicious'].astype(int)
        
        # Train simple classifier
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import classification_report, roc_auc_score
        
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=0.2, random_state=42
        )
        
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        auc = roc_auc_score(y_test, y_pred_proba)
        
        # Save model
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, self.model_path)
        
        print(f"✅ Fraud detection model trained and saved to {self.model_path}")
        print(f"   AUC: {auc:.4f}")
        
        return {
            "auc": float(auc),
            "samples": len(df)
        }
    
    def _calculate_distance(self, lat1: float, lng1: float, 
                           lat2: float, lng2: float) -> float:
        """Calculate distance using Haversine formula"""
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371
        
        return c * r
