# AI-TMS API Documentation

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require JWT authentication.

### Headers
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login to get JWT token

**Request:**
```json
{
  "email": "admin@ai-tms.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@ai-tms.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Fleet Management

#### GET /fleet/vehicles
List all vehicles

**Query Parameters:**
- `status` (optional): active, maintenance, inactive
- `depot_id` (optional): Filter by depot
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "vehicles": [
    {
      "id": "uuid",
      "license_plate": "กข-1234",
      "vehicle_type": "Truck 4-Wheel",
      "capacity_kg": 2000,
      "cost_per_km": 12.0,
      "status": "active",
      "depot_id": "uuid"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### POST /fleet/vehicles
Create new vehicle (Admin only)

**Request:**
```json
{
  "license_plate": "กข-1234",
  "vehicle_type": "Truck 4-Wheel",
  "capacity_kg": 2000,
  "cost_per_km": 12.0,
  "depot_id": "uuid"
}
```

### Orders

#### GET /orders
List all orders

**Query Parameters:**
- `status` (optional): pending, planned, assigned, in_progress, completed, failed, cancelled
- `customer_id` (optional): Filter by customer
- `date_from` (optional): Start date (YYYY-MM-DD)
- `date_to` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORD-001234",
      "customer_id": "uuid",
      "status": "pending",
      "priority": "normal",
      "weight_kg": 50,
      "created_at": "2026-02-01T00:00:00Z"
    }
  ],
  "total": 247
}
```

#### POST /orders
Create new order

**Request:**
```json
{
  "customer_id": "uuid",
  "priority": "normal",
  "weight_kg": 50,
  "volume_m3": 0.5,
  "items": 3,
  "notes": "Handle with care",
  "required_by": "2026-02-01T17:00:00Z"
}
```

### Route Planning

#### POST /routes/generate
Generate optimized routes (Planner only)

**Request:**
```json
{
  "date": "2026-02-01",
  "depot_id": "uuid",
  "order_ids": ["uuid1", "uuid2", "uuid3"],
  "vehicle_ids": ["uuid1", "uuid2"],
  "constraints": {
    "max_stops_per_route": 10,
    "max_distance_km": 100,
    "respect_time_windows": true
  }
}
```

**Response:**
```json
{
  "routes": [
    {
      "id": "uuid",
      "route_number": "RT-001",
      "vehicle_id": "uuid",
      "total_distance_km": 45.2,
      "total_duration_min": 180,
      "total_stops": 8,
      "estimated_cost": 542.4,
      "stops": [...]
    }
  ],
  "summary": {
    "total_routes": 2,
    "total_orders": 15,
    "total_cost": 1084.8,
    "on_time_rate": 0.95
  }
}
```

### GPS Tracking

#### POST /tracking/gps
Update vehicle GPS location (Driver only)

**Request:**
```json
{
  "vehicle_id": "uuid",
  "route_id": "uuid",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "speed_kmh": 45.5,
  "heading": 90,
  "accuracy_meters": 10.5
}
```

#### GET /tracking/routes/:id
Get real-time tracking for a route

**Response:**
```json
{
  "route": {...},
  "current_location": {
    "latitude": 13.7563,
    "longitude": 100.5018,
    "speed_kmh": 45.5,
    "timestamp": "2026-02-01T10:30:00Z"
  },
  "stops": [...],
  "eta_minutes": 15
}
```

### Proof of Delivery

#### POST /pod
Submit proof of delivery (Driver only)

**Request (multipart/form-data):**
```
route_stop_id: uuid
photos: [file1, file2]
signature: file
recipient_name: "John Doe"
recipient_relation: "customer"
notes: "Delivered to reception"
latitude: 13.7563
longitude: 100.5018
```

**Response:**
```json
{
  "id": "uuid",
  "route_stop_id": "uuid",
  "photo_urls": ["url1", "url2"],
  "signature_url": "url",
  "fraud_score": 0.05,
  "is_flagged_suspicious": false
}
```

### Analytics

#### GET /analytics/dashboard
Get dashboard KPIs

**Response:**
```json
{
  "today": {
    "total_deliveries": 45,
    "completed": 42,
    "in_progress": 3,
    "on_time_rate": 0.98
  },
  "this_week": {
    "total_deliveries": 247,
    "avg_cost_per_drop": 192.1,
    "total_distance_km": 3245.6
  },
  "active_routes": 12,
  "available_vehicles": 38
}
```

## AI Service Endpoints

### Base URL
```
http://localhost:8000/api/v1
```

#### POST /predict-eta
Predict arrival time

**Request:**
```json
{
  "origin_lat": 13.7563,
  "origin_lng": 100.5018,
  "dest_lat": 13.7465,
  "dest_lng": 100.5348,
  "vehicle_type": "Truck 4-Wheel",
  "driver_id": "uuid",
  "customer_id": "uuid",
  "time_of_day": 10,
  "day_of_week": "Monday",
  "traffic_level": 1.2,
  "weather": "clear"
}
```

**Response:**
```json
{
  "eta_minutes": 25.5,
  "confidence_lower": 21.7,
  "confidence_upper": 29.3,
  "factors": {
    "distance_km": 8.5,
    "traffic_level": 1.2,
    "is_rush_hour": false
  }
}
```

#### POST /detect-anomalies
Detect vehicle anomalies

**Request:**
```json
{
  "vehicle_id": "uuid",
  "route_id": "uuid",
  "gps_points": [...],
  "planned_route": [...]
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "type": "long_stop",
      "severity": "medium",
      "duration_minutes": 35,
      "location": {...},
      "timestamp": "2026-02-01T10:30:00Z"
    }
  ],
  "risk_score": 0.4,
  "alerts": ["Detected 1 unusually long stop"]
}
```

#### POST /copilot
AI Copilot query (Thai language)

**Request:**
```json
{
  "query": "วันนี้คันไหนเสี่ยง late",
  "context": {
    "date": "2026-02-01",
    "active_routes": 12
  },
  "user_role": "planner"
}
```

**Response:**
```json
{
  "answer": "จากการวิเคราะห์ มีรถ 2 คันที่เสี่ยงส่งของล่าช้า...",
  "suggestions": [
    "พิจารณา re-plan เส้นทาง RT-005",
    "ติดต่อคนขับ VEH-023 เพื่อเร่งความเร็ว"
  ],
  "actions": [
    {
      "type": "replan_route",
      "label": "สร้างแผนเส้นทางใหม่",
      "requires_approval": true
    }
  ],
  "confidence": 0.85
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `501` - Not Implemented
