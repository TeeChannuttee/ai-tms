"""
Anomaly Detector Model
Detects unusual vehicle behavior and route deviations
"""

import numpy as np
import pandas as pd
from pathlib import Path
import joblib
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest
from datetime import datetime

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.model_path = Path(__file__).parent.parent / 'models' / 'anomaly_model.pkl'
        self.load_model()
    
    def load_model(self):
        """Load trained model from disk"""
        if self.model_path.exists():
            self.model = joblib.load(self.model_path)
            print(f"✅ Anomaly detection model loaded from {self.model_path}")
        else:
            print("⚠️  Anomaly detection model not found. Using rule-based detection.")
    
    def is_loaded(self) -> bool:
        return self.model is not None
    
    def detect(self, vehicle_id: str, route_id: str,
               gps_points: List[Dict[str, Any]],
               planned_route: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect anomalies in vehicle behavior
        Returns: anomalies list, risk score, and alerts
        """
        anomalies = []
        alerts = []
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame(gps_points)
        
        if len(df) == 0:
            return {
                "anomalies": [],
                "risk_score": 0.0,
                "alerts": []
            }
        
        # 1. Long stop detection
        long_stops = self._detect_long_stops(df)
        if long_stops:
            anomalies.extend(long_stops)
            alerts.append(f"Detected {len(long_stops)} unusually long stops")
        
        # 2. Speed anomalies
        speed_anomalies = self._detect_speed_anomalies(df)
        if speed_anomalies:
            anomalies.extend(speed_anomalies)
            alerts.append(f"Detected {len(speed_anomalies)} speed violations")
        
        # 3. Route deviation
        if planned_route:
            deviations = self._detect_route_deviation(df, planned_route)
            if deviations:
                anomalies.extend(deviations)
                alerts.append(f"Vehicle deviated from planned route {len(deviations)} times")
        
        # 4. Sequence anomalies (skipped stops)
        sequence_issues = self._detect_sequence_anomalies(df, planned_route)
        if sequence_issues:
            anomalies.extend(sequence_issues)
            alerts.append("Potential stop skipping detected")
        
        # Calculate overall risk score
        risk_score = min(len(anomalies) * 0.2, 1.0)
        
        return {
            "anomalies": anomalies,
            "risk_score": risk_score,
            "alerts": alerts
        }
    
    def _detect_long_stops(self, df: pd.DataFrame, threshold_minutes: int = 30) -> List[Dict]:
        """Detect stops longer than threshold"""
        anomalies = []
        
        if 'speed_kmh' not in df.columns:
            return anomalies
        
        # Find periods where speed is near zero
        df['is_stopped'] = df['speed_kmh'] < 5
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Group consecutive stops
        df['stop_group'] = (df['is_stopped'] != df['is_stopped'].shift()).cumsum()
        
        for group_id, group in df[df['is_stopped']].groupby('stop_group'):
            if len(group) < 2:
                continue
            
            duration_minutes = (group['timestamp'].max() - group['timestamp'].min()).total_seconds() / 60
            
            if duration_minutes > threshold_minutes:
                anomalies.append({
                    "type": "long_stop",
                    "severity": "medium" if duration_minutes < 60 else "high",
                    "duration_minutes": round(duration_minutes, 1),
                    "location": {
                        "lat": group['latitude'].mean(),
                        "lng": group['longitude'].mean()
                    },
                    "timestamp": group['timestamp'].min().isoformat()
                })
        
        return anomalies
    
    def _detect_speed_anomalies(self, df: pd.DataFrame, 
                                max_speed: float = 100.0) -> List[Dict]:
        """Detect excessive speed"""
        anomalies = []
        
        if 'speed_kmh' not in df.columns:
            return anomalies
        
        speeding = df[df['speed_kmh'] > max_speed]
        
        for _, row in speeding.iterrows():
            anomalies.append({
                "type": "speed_violation",
                "severity": "high" if row['speed_kmh'] > 120 else "medium",
                "speed_kmh": round(row['speed_kmh'], 1),
                "location": {
                    "lat": row['latitude'],
                    "lng": row['longitude']
                },
                "timestamp": row['timestamp']
            })
        
        return anomalies
    
    def _detect_route_deviation(self, df: pd.DataFrame, 
                                planned_route: List[Dict]) -> List[Dict]:
        """Detect when vehicle deviates from planned route"""
        anomalies = []
        
        # Simplified: check if vehicle is too far from any planned point
        # In production, use proper route matching algorithms
        
        for _, point in df.iterrows():
            min_distance = float('inf')
            
            for planned_point in planned_route:
                distance = self._calculate_distance(
                    point['latitude'], point['longitude'],
                    planned_point['latitude'], planned_point['longitude']
                )
                min_distance = min(min_distance, distance)
            
            # If more than 2km from planned route
            if min_distance > 2.0:
                anomalies.append({
                    "type": "route_deviation",
                    "severity": "medium",
                    "distance_km": round(min_distance, 2),
                    "location": {
                        "lat": point['latitude'],
                        "lng": point['longitude']
                    },
                    "timestamp": point['timestamp']
                })
        
        return anomalies
    
    def _detect_sequence_anomalies(self, df: pd.DataFrame, 
                                   planned_route: List[Dict]) -> List[Dict]:
        """Detect if stops are visited out of sequence"""
        # Simplified implementation
        # In production, track actual stop visits vs planned sequence
        return []
    
    def train(self) -> Dict[str, float]:
        """Train anomaly detection model using historical data"""
        print("🚀 Training anomaly detection model...")
        
        # Load historical GPS data
        data_path = Path(__file__).parent.parent.parent / 'data' / 'historical' / 'gps_tracking.csv'
        
        if not data_path.exists():
            raise FileNotFoundError(f"Historical data not found at {data_path}")
        
        df = pd.read_csv(data_path)
        
        # Feature engineering
        features = df[['speed_kmh', 'accuracy_meters']].fillna(0)
        
        # Train Isolation Forest
        self.model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        
        self.model.fit(features)
        
        # Save model
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, self.model_path)
        
        print(f"✅ Anomaly detection model trained and saved to {self.model_path}")
        
        return {
            "samples": len(df),
            "contamination": 0.1
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
