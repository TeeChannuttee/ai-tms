# 🗄️ Database Setup Guide

## วิธีที่ 1: ใช้ Docker (แนะนำ - ง่ายที่สุด)

### ขั้นตอน:

1. **ติดตั้ง Docker Desktop** (ถ้ายังไม่มี)
   - ดาวน์โหลด: https://www.docker.com/products/docker-desktop/
   - ติดตั้งและเปิดโปรแกรม Docker Desktop

2. **รัน PostgreSQL Container**
   ```powershell
   docker run --name ai-tms-postgres `
     -e POSTGRES_PASSWORD=tms_password_change_me `
     -e POSTGRES_DB=ai_tms `
     -e POSTGRES_USER=tms_user `
     -p 5432:5432 `
     -d postgres:15
   ```

3. **รัน Redis Container**
   ```powershell
   docker run --name ai-tms-redis `
     -p 6379:6379 `
     -d redis:7
   ```

4. **ตรวจสอบว่า containers ทำงาน**
   ```powershell
   docker ps
   ```
   ควรเห็น 2 containers: `ai-tms-postgres` และ `ai-tms-redis`

5. **ไฟล์ `.env` ของคุณพร้อมใช้งานแล้ว!**
   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=ai_tms
   POSTGRES_USER=tms_user
   POSTGRES_PASSWORD=tms_password_change_me
   
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

---

## วิธีที่ 2: ติดตั้ง PostgreSQL แบบ Native (Windows)

### ขั้นตอน:

1. **ดาวน์โหลด PostgreSQL**
   - ไป: https://www.postgresql.org/download/windows/
   - ดาวน์โหลด installer (แนะนำ version 15)

2. **ติดตั้ง PostgreSQL**
   - รัน installer
   - ตั้งรหัสผ่าน postgres (จำไว้!)
   - เลือก port: 5432 (default)

3. **สร้าง Database และ User**
   ```powershell
   # เปิด psql (ใน Start Menu → PostgreSQL → SQL Shell)
   
   # Login ด้วย user postgres
   # แล้วรันคำสั่ง:
   
   CREATE USER tms_user WITH PASSWORD 'tms_password_change_me';
   CREATE DATABASE ai_tms OWNER tms_user;
   GRANT ALL PRIVILEGES ON DATABASE ai_tms TO tms_user;
   ```

4. **ติดตั้ง Redis**
   - ดาวน์โหลด: https://github.com/microsoftarchive/redis/releases
   - หรือใช้ WSL: `wsl -d Ubuntu sudo apt install redis-server`

---

## 🧪 ทดสอบการเชื่อมต่อ

### Test PostgreSQL:
```powershell
# ใช้ psql
psql -h localhost -U tms_user -d ai_tms

# หรือใช้ Go
cd backend
go run cmd/server/main.go
```

### Test Redis:
```powershell
# ใช้ redis-cli
redis-cli ping
# ควรได้ PONG
```

---

## 🔧 คำสั่ง Docker ที่มีประโยชน์

```powershell
# ดู containers ที่รันอยู่
docker ps

# ดู containers ทั้งหมด (รวมที่หยุด)
docker ps -a

# หยุด container
docker stop ai-tms-postgres
docker stop ai-tms-redis

# เริ่ม container ที่หยุดไว้
docker start ai-tms-postgres
docker start ai-tms-redis

# ลบ container (ต้องหยุดก่อน)
docker rm ai-tms-postgres
docker rm ai-tms-redis

# ดู logs
docker logs ai-tms-postgres
docker logs ai-tms-redis

# เข้าไปใน PostgreSQL container
docker exec -it ai-tms-postgres psql -U tms_user -d ai_tms
```

---

## ✅ Next Steps

หลังจากตั้งค่า Database แล้ว:

1. **Run Database Migrations**
   ```powershell
   cd backend
   go run cmd/migrate/main.go
   ```

2. **Start Backend Server**
   ```powershell
   cd backend
   go run cmd/server/main.go
   ```

3. **ตรวจสอบว่าทำงาน**
   - เปิด browser: http://localhost:8080
   - ควรเห็น API response

---

## ❓ Troubleshooting

### Port 5432 ถูกใช้งานอยู่
```powershell
# ดูว่าโปรแกรมไหนใช้ port
netstat -ano | findstr :5432

# เปลี่ยน port ใน .env
POSTGRES_PORT=5433

# รัน Docker ด้วย port ใหม่
docker run ... -p 5433:5432 ...
```

### Docker ไม่ทำงาน
- เปิด Docker Desktop
- ตรวจสอบว่า WSL 2 ติดตั้งแล้ว
- Restart Docker Desktop

### Connection refused
- ตรวจสอบว่า container ทำงานอยู่: `docker ps`
- ตรวจสอบ logs: `docker logs ai-tms-postgres`
- ตรวจสอบ firewall settings
