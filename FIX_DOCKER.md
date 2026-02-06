# 🔧 แก้ปัญหา Docker Containers

## ปัญหา: "accessing a corrupted shared library"

### วิธีแก้ (รันทีละคำสั่ง):

```powershell
# 1. หยุดและลบ containers เก่า
docker rm -f ai-tms-postgres ai-tms-redis

# 2. ลบ images ที่เสีย
docker rmi postgres:15 redis:7

# 3. Restart Docker Desktop
# - คลิกขวาที่ Docker icon ใน system tray
# - เลือก "Restart"
# - รอให้ Docker เริ่มใหม่ (ประมาณ 30 วินาที)

# 4. ดาวน์โหลด images ใหม่
docker pull postgres:15
docker pull redis:7

# 5. รัน containers ใหม่
docker run --name ai-tms-postgres -e POSTGRES_PASSWORD=tms_password_change_me -e POSTGRES_DB=ai_tms -e POSTGRES_USER=tms_user -p 5432:5432 -d postgres:15

docker run --name ai-tms-redis -p 6379:6379 -d redis:7

# 6. ตรวจสอบ
docker ps
```

---

## ถ้ายังไม่ได้ผล - ใช้ Docker Compose (แนะนำ)

ง่ายกว่าและเสถียรกว่า! ใช้ไฟล์ `docker-compose.yml` ที่มีอยู่แล้ว:

```powershell
# ไปที่ root directory
cd C:\Users\Channuttee\Downloads\AI\ai-tms

# รัน Docker Compose
docker-compose up -d

# ตรวจสอบ
docker-compose ps
```

---

## ถ้ายังไม่ได้ผล - ใช้ PostgreSQL แบบ Native

1. **ดาวน์โหลด PostgreSQL**
   - https://www.postgresql.org/download/windows/
   - เลือก version 15

2. **ติดตั้ง**
   - รัน installer
   - ตั้งรหัสผ่าน: `tms_password_change_me`
   - Port: 5432

3. **สร้าง Database**
   ```sql
   -- เปิด SQL Shell (psql)
   CREATE USER tms_user WITH PASSWORD 'tms_password_change_me';
   CREATE DATABASE ai_tms OWNER tms_user;
   GRANT ALL PRIVILEGES ON DATABASE ai_tms TO tms_user;
   ```

4. **แก้ไข .env**
   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=ai_tms
   POSTGRES_USER=tms_user
   POSTGRES_PASSWORD=tms_password_change_me
   ```

---

## Troubleshooting เพิ่มเติม

### ตรวจสอบ Docker Desktop
```powershell
# ดู Docker version
docker version

# ดู Docker info
docker info

# ตรวจสอบ WSL 2
wsl --list --verbose
```

### ถ้า WSL 2 มีปัญหา
```powershell
# Update WSL
wsl --update

# Restart WSL
wsl --shutdown
```

### Clean Docker ทั้งหมด (ระวัง!)
```powershell
# ลบ containers ทั้งหมด
docker rm -f $(docker ps -aq)

# ลบ images ทั้งหมด
docker rmi -f $(docker images -q)

# ลบ volumes
docker volume prune -f

# ลบ networks
docker network prune -f
```
