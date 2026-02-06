"""
AI-TMS AI Service
FastAPI service for ML models and AI features:
- Traffic-aware ETA prediction
- Dynamic re-planning
- Anomaly detection
- POD fraud detection
- AI Copilot (Thai language)
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from models.eta_predictor import ETAPredictor
from models.anomaly_detector import AnomalyDetector
from models.fraud_detector import FraudDetector
from models.ai_copilot import AICopilot
from models.service_time_predictor import ServiceTimePredictor

app = FastAPI(
    title="AI-TMS AI Service",
    description="AI/ML service for Transportation Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML models
eta_predictor = ETAPredictor()
anomaly_detector = AnomalyDetector()
fraud_detector = FraudDetector()
ai_copilot = AICopilot()
service_time_predictor = ServiceTimePredictor()

# Pydantic models
class ETAPredictionRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    vehicle_type: str
    driver_id: str
    customer_id: str
    time_of_day: int
    day_of_week: str
    traffic_level: Optional[float] = 1.0
    weather: Optional[str] = "clear"

class ETAPredictionResponse(BaseModel):
    eta_minutes: float
    confidence_lower: float
    confidence_upper: float
    factors: Dict[str, Any]

class AnomalyDetectionRequest(BaseModel):
    vehicle_id: str
    route_id: str
    gps_points: List[Dict[str, Any]]
    planned_route: List[Dict[str, Any]]

class AnomalyDetectionResponse(BaseModel):
    anomalies: List[Dict[str, Any]]
    risk_score: float
    alerts: List[str]

class FraudDetectionRequest(BaseModel):
    delivery_id: str
    photo_urls: List[str]
    signature_url: Optional[str]
    gps_lat: float
    gps_lng: float
    gps_accuracy: float
    timestamp: datetime
    expected_location: Dict[str, float]

class FraudDetectionResponse(BaseModel):
    fraud_score: float
    is_suspicious: bool
    reasons: List[str]
    recommendations: List[str]

class CopilotRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
    user_role: str

class CopilotResponse(BaseModel):
    answer: str
    suggestions: List[str]
    actions: List[Dict[str, Any]]
    confidence: float

class ServiceTimeRequest(BaseModel):
    customer_id: str
    order_weight_kg: float
    order_items: int
    stop_type: str = "delivery"
    customer_avg_service_time: Optional[float] = 10.0
    hour_of_day: Optional[int] = 12
    day_of_week: Optional[int] = 1

class ServiceTimeResponse(BaseModel):
    predicted_minutes: float
    confidence_interval: List[float]
    model_version: str

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-tms-ai-service",
        "version": "1.0.0",
        "models": {
            "eta_predictor": eta_predictor.is_loaded(),
            "anomaly_detector": anomaly_detector.is_loaded(),
            "fraud_detector": fraud_detector.is_loaded(),
            "ai_copilot": ai_copilot.is_loaded(),
            "service_time_predictor": service_time_predictor.is_ready
        }
    }

# ETA Prediction
@app.post("/api/v1/predict-eta", response_model=ETAPredictionResponse)
async def predict_eta(request: ETAPredictionRequest):
    """Predict arrival time with confidence intervals"""
    try:
        result = eta_predictor.predict(
            origin_lat=request.origin_lat,
            origin_lng=request.origin_lng,
            dest_lat=request.dest_lat,
            dest_lng=request.dest_lng,
            vehicle_type=request.vehicle_type,
            driver_id=request.driver_id,
            customer_id=request.customer_id,
            time_of_day=request.time_of_day,
            day_of_week=request.day_of_week,
            traffic_level=request.traffic_level,
            weather=request.weather
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Service Time Prediction
@app.post("/api/v1/predict-service-time", response_model=ServiceTimeResponse)
async def predict_service_time(request: ServiceTimeRequest):
    """Predict service time for a stop"""
    try:
        features = request.dict()
        result = service_time_predictor.predict(features)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Anomaly Detection
@app.post("/api/v1/detect-anomalies", response_model=AnomalyDetectionResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """Detect anomalies in vehicle behavior and route execution"""
    try:
        result = anomaly_detector.detect(
            vehicle_id=request.vehicle_id,
            route_id=request.route_id,
            gps_points=request.gps_points,
            planned_route=request.planned_route
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POD Fraud Detection
@app.post("/api/v1/detect-fraud", response_model=FraudDetectionResponse)
async def detect_fraud(request: FraudDetectionRequest):
    """Detect fraudulent proof of delivery"""
    try:
        result = fraud_detector.detect(
            delivery_id=request.delivery_id,
            photo_urls=request.photo_urls,
            signature_url=request.signature_url,
            gps_lat=request.gps_lat,
            gps_lng=request.gps_lng,
            gps_accuracy=request.gps_accuracy,
            timestamp=request.timestamp,
            expected_location=request.expected_location
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AI Copilot
@app.post("/api/v1/copilot", response_model=CopilotResponse)
async def copilot_query(request: CopilotRequest):
    """AI Copilot for natural language queries (Thai language support)"""
    try:
        result = ai_copilot.query(
            query=request.query,
            context=request.context,
            user_role=request.user_role
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Model training endpoints (admin only)
@app.post("/api/v1/train/eta")
async def train_eta_model():
    """Trigger ETA model retraining"""
    try:
        result = eta_predictor.train()
        return {"status": "success", "metrics": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/train/anomaly")
async def train_anomaly_model():
    """Trigger anomaly detection model retraining"""
    try:
        result = anomaly_detector.train()
        return {"status": "success", "metrics": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/train/fraud")
async def train_fraud_model():
    """Trigger fraud detection model retraining"""
    try:
        result = fraud_detector.train()
        return {"status": "success", "metrics": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
