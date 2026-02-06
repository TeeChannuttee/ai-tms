# 🔧 Build Errors - Quick Fix Guide

## ปัญหาที่พบ

มี **2 ประเภทหลัก**:

### 1. ✅ **FIXED**: Missing Dependencies
- ✅ เพิ่ม `gofpdf` ใน go.mod แล้ว
- ✅ Run `go mod tidy` เสร็จแล้ว
- ✅ เพิ่ม fields ใน models แล้ว

### 2. ⚠️ **REMAINING**: Type Mismatches

#### A) Capacity Type (int vs float64)
**ปัญหา**: `Capacity` เป็น `int` แต่ handlers ใช้เป็น `float64`

**แก้ไข**: เปลี่ยน `Capacity int` เป็น `Capacity float64` ใน models.go

```go
// ใน Vehicle struct (line 48)
Capacity     float64    `gorm:"-" json:"-"` // เปลี่ยนจาก int
CapacityKg   float64    `gorm:"not null" json:"capacity_kg"` // เปลี่ยนจาก int
```

#### B) Time Pointer (*time.Time vs time.Time)
**ปัญหา**: `PickupTime` เป็น `*time.Time` แต่บาง handlers ส่งเป็น `time.Time`

**แก้ไข**: ใช้ `&req.PickupTime` แทน `req.PickupTime`

```go
// ใน orders.go
PickupTime:   &req.PickupTime,   // เพิ่ม &
DeliveryTime: &req.DeliveryTime, // เพิ่ม &
```

#### C) Heading Type (float64 vs int)
**ปัญหา**: `Heading` เป็น `int` แต่ request ส่งเป็น `float64`

**แก้ไข**: Cast เป็น int

```go
// ใน tracking.go (line 39)
Heading:   int(req.Heading), // เพิ่ม int()
```

#### D) Middleware GenerateToken
**ปัญหา**: `GenerateToken` return 2 values แต่ handlers เรียกแบบ 3 values

**แก้ไข**: เอา `expiresAt` ออก

```go
// เดิม (ผิด)
token, expiresAt, err := middleware.GenerateToken(...)

// ใหม่ (ถูก)
token, err := middleware.GenerateToken(...)
```

#### E) ValidateToken ไม่มี
**ปัญหา**: `middleware.ValidateToken` ไม่มีฟังก์ชันนี้

**แก้ไข**: ใช้ `jwt.ParseWithClaims` แทน หรือสร้างฟังก์ชันใหม่

---

## 🚀 Quick Fix Commands

```powershell
cd C:\Users\Channuttee\Downloads\AI\ai-tms\backend

# 1. แก้ Capacity type
# แก้ใน models.go line 46-48

# 2. แก้ Time pointers  
# แก้ใน orders.go, handlers ที่ใช้ PickupTime/DeliveryTime

# 3. แก้ Heading
# แก้ใน tracking.go line 39

# 4. แก้ GenerateToken calls
# แก้ใน auth.go ทุกที่ที่เรียก GenerateToken

# 5. Test build
go build ./cmd/server
```

---

## 📝 Files ที่ต้องแก้

1. `backend/internal/models/models.go` - เปลี่ยน Capacity เป็น float64
2. `backend/internal/handlers/auth.go` - แก้ GenerateToken calls
3. `backend/internal/handlers/orders.go` - แก้ time pointers
4. `backend/internal/handlers/tracking.go` - แก้ Heading cast
5. `backend/internal/handlers/fleet.go` - แก้ Capacity type
6. `backend/internal/services/vrp_solver.go` - แก้ Capacity comparison

---

## ⏱️ Estimated Fix Time

- **5-10 นาที** ถ้าแก้ทีละไฟล์
- **2-3 นาที** ถ้าใช้ find & replace

---

## 🎯 Priority

1. **HIGH**: Capacity type (กระทบหลายไฟล์)
2. **HIGH**: GenerateToken calls (กระทบ auth)
3. **MEDIUM**: Time pointers
4. **LOW**: Heading cast
5. **LOW**: ValidateToken (ไม่ได้ใช้งาน)

---

**Status**: Ready to fix  
**Total Errors**: ~50  
**Unique Issues**: 5  
**Estimated LOC to change**: ~20 lines
