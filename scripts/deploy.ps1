# PowerShell Deployment Script for Windows
# AI-TMS Deployment

Write-Host "🚀 AI-TMS Deployment Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and configure it first." -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
docker-compose build

Write-Host "🔄 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

$services = @("backend", "ai-service", "realtime-service", "postgres", "redis")

foreach ($service in $services) {
    $status = docker-compose ps $service 2>$null
    if ($status -match "Up") {
        Write-Host "✅ $service is running" -ForegroundColor Green
    } else {
        Write-Host "❌ $service failed to start" -ForegroundColor Red
        docker-compose logs $service
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "  - Backend API:      http://localhost:8080" -ForegroundColor White
Write-Host "  - AI Service:       http://localhost:8000" -ForegroundColor White
Write-Host "  - Real-time:        http://localhost:8081" -ForegroundColor White
Write-Host "  - Planner UI:       http://localhost:3000" -ForegroundColor White
Write-Host "  - Driver App:       http://localhost:3001" -ForegroundColor White
Write-Host "  - Customer Portal:  http://localhost:3002" -ForegroundColor White
Write-Host "  - Grafana:          http://localhost:3003" -ForegroundColor White
Write-Host ""
Write-Host "📝 View logs:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f [service-name]" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Stop all services:" -ForegroundColor Cyan
Write-Host "  docker-compose down" -ForegroundColor White
