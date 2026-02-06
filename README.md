# 🚚 AI-TMS: AI-Powered Transportation Management System

Enterprise-grade Transportation Management System with advanced AI capabilities for route optimization, real-time tracking, and intelligent decision-making.

## 🌟 Features

### Core TMS Features
- **Fleet & Driver Management** - Complete master data management
- **Order & Shipment Management** - Multi-stop routes with time windows
- **Route Planning (VRP)** - Automated multi-vehicle route optimization
- **Real-time Tracking** - Live GPS tracking with WebSocket updates
- **Dispatching** - Assign and monitor routes in real-time
- **Proof of Delivery (POD)** - Photo, signature, and GPS verification
- **Analytics & Reporting** - Comprehensive KPI dashboards

### AI-Powered Features 🤖
1. **Traffic-Aware ETA** - ML-based arrival time prediction
2. **Dynamic Re-Planning** - Automatic route adjustment for disruptions
3. **Anomaly Detection** - Identify unusual driver/vehicle behavior
4. **POD Fraud Detection** - Detect fake delivery proofs
5. **AI Copilot** - Natural language interface (Thai language support)

## 🏗️ Architecture

```
ai-tms/
├── backend/           # Go (Gin) - Business API
├── ai-service/        # Python (FastAPI) - ML models & AI features
├── realtime-service/  # Go - WebSocket for live tracking
├── planner-ui/        # Next.js - Route planning & control tower
├── driver-app/        # Next.js PWA - Mobile driver interface
├── customer-portal/   # Next.js - Customer tracking portal
├── data/              # Sample & historical data for ML training
└── infrastructure/    # Docker, monitoring, CI/CD configs
```

## 🛠️ Tech Stack

- **Backend**: Go 1.21+ (Gin framework)
- **AI/ML**: Python 3.11+ (FastAPI, scikit-learn, LightGBM)
- **Frontend**: Next.js 14+ (TypeScript, TailwindCSS)
- **Database**: PostgreSQL 15+ with PostGIS
- **Cache**: Redis 7+
- **Maps**: Google Maps API
- **Monitoring**: Prometheus + Grafana
- **Logging**: Structured JSON logs
- **Container**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Go 1.21+
- Python 3.11+
- Google Maps API Key

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ai-tms
cp .env.example .env
# Edit .env and add your Google Maps API key
```

### 2. Start All Services
```bash
docker-compose up -d
```

### 3. Initialize Database
```bash
cd backend
go run cmd/migrate/main.go
go run cmd/seed/main.go
```

### 4. Train AI Models
```bash
cd ai-service
python scripts/train_eta_model.py
python scripts/train_anomaly_detector.py
```

### 5. Access Applications
- **Planner UI**: http://localhost:3000
- **Driver App**: http://localhost:3001
- **Customer Portal**: http://localhost:3002
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:8000
- **Grafana**: http://localhost:3003

## 📊 Sample Data

The system includes realistic historical data for ML training:
- 10,000+ completed deliveries
- 50+ vehicles
- 100+ drivers
- 500+ customers
- 6 months of GPS tracking data

## 🧪 Testing

```bash
# Backend tests
cd backend && go test ./...

# AI service tests
cd ai-service && pytest

# Frontend tests
cd planner-ui && npm test
```

## 📖 Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [AI Models](./docs/ai-models.md)
- [Deployment Guide](./docs/deployment.md)
- [User Guides](./docs/user-guides/)

## 🔐 Default Credentials

**Admin**: admin@ai-tms.com / admin123  
**Planner**: planner@ai-tms.com / planner123  
**Dispatcher**: dispatcher@ai-tms.com / dispatcher123  
**Driver**: driver001@ai-tms.com / driver123  
**Customer**: customer@example.com / customer123

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is an educational/portfolio project. Contributions are welcome!

---

**Built with ❤️ for Enterprise-Grade Logistics**
