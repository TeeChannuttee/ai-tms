#!/bin/bash

# AI-TMS Deployment Script
# This script builds and deploys all services

set -e

echo "🚀 AI-TMS Deployment Script"
echo "=============================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it first."
    exit 1
fi

# Load environment variables
source .env

echo "📦 Building Docker images..."
docker-compose build

echo "🔄 Stopping existing containers..."
docker-compose down

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

services=("backend" "ai-service" "realtime-service" "postgres" "redis")

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service failed to start"
        docker-compose logs $service
        exit 1
    fi
done

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service URLs:"
echo "  - Backend API:      http://localhost:8080"
echo "  - AI Service:       http://localhost:8000"
echo "  - Real-time:        http://localhost:8081"
echo "  - Planner UI:       http://localhost:3000"
echo "  - Driver App:       http://localhost:3001"
echo "  - Customer Portal:  http://localhost:3002"
echo "  - Grafana:          http://localhost:3003"
echo ""
echo "📝 View logs:"
echo "  docker-compose logs -f [service-name]"
echo ""
echo "🛑 Stop all services:"
echo "  docker-compose down"
