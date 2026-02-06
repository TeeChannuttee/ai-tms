# 🚀 Quick Start - AI-TMS

## ✅ Database Setup Complete!

PostgreSQL และ Redis ทำงานแล้ว

---

## 📋 Next Steps

### 1. **Run Database Migrations**

```powershell
cd backend
go run cmd/migrate/main.go
```

### 2. **Start Backend Server**

```powershell
go run cmd/server/main.go
```

Backend: http://localhost:8080

---

## 🔑 ต้องตั้งค่า API Keys

แก้ไข `.env`:

### Google Maps API Key (สำคัญ!)
```env
GOOGLE_MAPS_API_KEY=your-key-here
```

ได้จาก: https://console.cloud.google.com/

### OpenAI API Key (Optional)
```env
OPENAI_API_KEY=sk-proj-your-key
```

---

## 🧪 Test API

```powershell
# Register
curl -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123","name":"Admin","role":"admin"}'

# Login
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123"}'
```

---

## 🐳 Docker Commands

```powershell
# ดู status
docker-compose ps

# ดู logs
docker-compose logs postgres

# Restart
docker-compose restart postgres redis

# Stop
docker-compose down
```
