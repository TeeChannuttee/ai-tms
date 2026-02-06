# AI-TMS Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- Node.js 20+ (for local development)
- Go 1.21+ (for local development)
- Python 3.11+ (for local development)
- Google Maps API Key

## Step 1: Clone and Setup Environment

```powershell
cd C:\Users\Channuttee\Downloads\AI\ai-tms
copy .env.example .env
```

Edit `.env` and add your API keys:
- `GOOGLE_MAPS_API_KEY=your-key-here`
- `OPENAI_API_KEY=your-key-here` (optional, for AI Copilot)
- `JWT_SECRET=your-secret-key`

## Step 2: Generate Historical Data

```powershell
cd data\scripts
python -m venv venv
.\venv\Scripts\activate
pip install pandas numpy
python generate_historical_data.py
```

This will create ~10,000 delivery records with GPS tracking and POD data.

## Step 3: Start All Services with Docker Compose

```powershell
cd C:\Users\Channuttee\Downloads\AI\ai-tms
docker-compose up -d
```

Wait for all services to start (check with `docker-compose ps`)

## Step 4: Initialize Database

```powershell
# Wait for PostgreSQL to be ready
docker-compose exec backend go run cmd/migrate/main.go
docker-compose exec backend go run cmd/seed/main.go
```

## Step 5: Train AI Models

```powershell
docker-compose exec ai-service python scripts/train_all_models.py
```

This will train:
- ETA Prediction Model
- Anomaly Detection Model
- POD Fraud Detection Model

## Step 6: Access Applications

Open your browser and navigate to:

- **Planner UI**: http://localhost:3000
- **Driver App**: http://localhost:3001
- **Customer Portal**: http://localhost:3002
- **Backend API**: http://localhost:8080/health
- **AI Service**: http://localhost:8000/health
- **Grafana**: http://localhost:3003 (admin/admin)

## Step 7: Login

Default credentials:

**Admin**
- Email: admin@ai-tms.com
- Password: admin123

**Planner**
- Email: planner@ai-tms.com
- Password: planner123

**Driver**
- Email: driver001@ai-tms.com
- Password: driver123

## Troubleshooting

### Services won't start
```powershell
docker-compose down
docker-compose up -d --build
```

### Database connection errors
```powershell
docker-compose restart postgres
# Wait 10 seconds
docker-compose restart backend
```

### Check logs
```powershell
docker-compose logs -f backend
docker-compose logs -f ai-service
```

## Development Mode (without Docker)

### Backend
```powershell
cd backend
go mod download
go run cmd/server/main.go
```

### AI Service
```powershell
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

### Planner UI
```powershell
cd planner-ui
npm install
npm run dev
```

### Driver App (Expo)
```powershell
cd driver-mobile
npm install
npx expo start
```

## Next Steps

1. Explore the Planner UI to create routes
2. Test the Driver App on your mobile device
3. Check Grafana dashboards for metrics
4. Try the AI Copilot with Thai queries

## Support

For issues, check:
- Logs: `docker-compose logs -f [service-name]`
- Health endpoints: http://localhost:8080/health
- Database: Connect to PostgreSQL on localhost:5432
