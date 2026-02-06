# 🚚 Logistics Core Platform: AI-Powered Transportation Management System

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

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is an educational/portfolio project. Contributions are welcome!

---

**Built with ❤️ for Enterprise-Grade Logistics**
