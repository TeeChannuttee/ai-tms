package main

import (
	"log"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Use absolute path for robustness
	envPath := "D:/ai-tms/.env"
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️ Failed to load .env from %s: %v", envPath, err)
	} else {
		log.Printf("✅ Loaded .env from: %s", envPath)
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("🌱 Seeding database with sample data...")

	// Create or Fetch admin user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := models.User{
		ID:       uuid.New(),
		Email:    "admin@ai-tms.com",
		Password: string(hashedPassword),
		Name:     "Admin User",
		Phone:    "0812345678",
		Role:     "admin",
		IsActive: true,
	}
	if err := database.DB.Create(&admin).Error; err != nil {
		log.Printf("⚠️ Admin user exists or error: %v", err)
		admin.ID = uuid.Nil
		database.DB.Where("email = ?", "admin@ai-tms.com").First(&admin)
	} else {
		log.Println("✅ Created admin user (admin@ai-tms.com / admin123)")
	}

	// Create or Fetch driver user
	hashedDriverPassword, _ := bcrypt.GenerateFromPassword([]byte("driver123"), bcrypt.DefaultCost)
	driverUser := models.User{
		ID:       uuid.New(),
		Email:    "driver001@ai-tms.com",
		Password: string(hashedDriverPassword),
		Name:     "Somchai Driver",
		Phone:    "0899999999",
		Role:     "driver",
		IsActive: true,
	}
	if err := database.DB.Create(&driverUser).Error; err != nil {
		log.Printf("⚠️ Driver user exists or error: %v", err)
		// Clear ID so GORM doesn't include it in WHERE clause
		idToSearch := driverUser.ID
		driverUser.ID = uuid.Nil
		if err := database.DB.Where("email = ?", "driver001@ai-tms.com").First(&driverUser).Error; err != nil {
			log.Printf("❌ CRITICAL: Could not find existing driver user: %v", err)
		}
		log.Printf("ℹ️ Using existing Driver User ID: %s (Original random was %s)", driverUser.ID, idToSearch)
	} else {
		log.Println("✅ Created driver user (driver001@ai-tms.com / driver123)")
	}

	// Create or Fetch Depot
	var realDepot models.Depot
	depotCode := "BKK-001"
	if err := database.DB.Where("code = ?", depotCode).First(&realDepot).Error; err != nil {
		log.Printf("⚠️ Depot %s not found, creating...", depotCode)
		realDepot = models.Depot{
			ID:        uuid.New(),
			Code:      depotCode,
			Name:      "Bangkok Main DC",
			Address:   "123 Ladkrabang, Bangkok",
			Latitude:  13.73,
			Longitude: 100.77,
		}
		if err := database.DB.Create(&realDepot).Error; err != nil {
			log.Fatalf("❌ Failed to create depot: %v", err)
		}
		log.Println("✅ Created Depot: BKK-001")
	} else {
		log.Println("ℹ️ Found existing Depot: BKK-001")
	}

	// Create or Fetch driver profile
	driverProfile := models.Driver{
		ID:              uuid.New(),
		UserID:          driverUser.ID,
		LicenseNumber:   "L-998877",
		ExperienceYears: 5,
		Rating:          4.8,
		ShiftStart:      "08:00",
		ShiftEnd:        "17:00",
		Status:          "active",
		DepotID:         realDepot.ID,
	}

	if err := database.DB.Where("user_id = ?", driverUser.ID).First(&models.Driver{}).Error; err == nil {
		database.DB.Where("user_id = ?", driverUser.ID).First(&driverProfile)
		log.Println("ℹ️ Driver profile already exists, using it.")
	} else {
		if err := database.DB.Create(&driverProfile).Error; err != nil {
			log.Printf("⚠️ Failed to create driver profile: %v", err)
		} else {
			log.Println("✅ Created driver profile for Somchai")
		}
	}

	// -------------------------
	// Create Vehicle for the Route
	// -------------------------
	var vehicle models.Vehicle
	vehiclePlate := "1AB-9999"
	if err := database.DB.Where("license_plate = ?", vehiclePlate).First(&vehicle).Error; err != nil {
		vehicle = models.Vehicle{
			ID:           uuid.New(),
			LicensePlate: vehiclePlate,
			VehicleType:  "Truck 4-Wheel",
			CapacityKg:   2000,
			CostPerKm:    15.0,
			DepotID:      realDepot.ID,
			Status:       "active",
		}
		if err := database.DB.Create(&vehicle).Error; err != nil {
			log.Fatalf("❌ Failed to create vehicle: %v", err)
		}
		log.Printf("✅ Created Vehicle: %s (ID: %s)", vehiclePlate, vehicle.ID)
	} else {
		log.Printf("ℹ️ Found existing Vehicle: %s (ID: %s)", vehiclePlate, vehicle.ID)
	}

	// Create a route for today
	route := models.Route{
		ID:               uuid.New(),
		RouteNumber:      "R-SOMCHAI-0" + uuid.New().String()[:4], // Unique number
		Date:             time.Now(),
		VehicleID:        vehicle.ID,
		DriverID:         &driverProfile.ID,
		DepotID:          realDepot.ID,
		Status:           "assigned",
		PlannedStartTime: time.Now().Add(8 * time.Hour),
		PlannedEndTime:   time.Now().Add(17 * time.Hour),
		TotalDistanceKm:  120.5,
		EstimatedCost:    500.0,
	}
	if err := database.DB.Create(&route).Error; err != nil {
		log.Fatalf("❌ Failed to create route: %v", err)
	}
	log.Printf("✅ Assigned Route %s to driver", route.RouteNumber)

	// Fetch existing orders to add as stops
	var existingOrders []models.Order
	if err := database.DB.Limit(3).Find(&existingOrders).Error; err == nil && len(existingOrders) > 0 {
		for i, ord := range existingOrders {
			stop := models.RouteStop{
				ID:             uuid.New(),
				RouteID:        route.ID,
				OrderID:        ord.ID,
				Sequence:       i + 1,
				PlannedArrival: time.Now().Add(time.Duration(9+i) * time.Hour),
				Status:         "pending",
			}
			if err := database.DB.Create(&stop).Error; err != nil {
				log.Printf("⚠️ Failed to create stop %d: %v", i+1, err)
			}
		}
		log.Printf("✅ Added %d stops to route", len(existingOrders))
	} else if err != nil {
		log.Printf("⚠️ Failed to find existing orders for stops: %v", err)
	} else {
		log.Println("⚠️ No orders found to create stops")
	}

	// Create customers
	customers := []models.Customer{
		{
			ID:                    uuid.New(),
			Code:                  "CUST-001",
			Name:                  "7-Eleven Sukhumvit 21",
			BusinessType:          "Retail",
			Address:               "Sukhumvit 21, Bangkok",
			Latitude:              13.7408,
			Longitude:             100.5609,
			Location:              "POINT(100.5609 13.7408)",
			TimeWindowStart:       "09:00",
			TimeWindowEnd:         "17:00",
			AvgServiceTimeMinutes: 15,
			AccessDifficulty:      "Easy",
			ParkingAvailability:   "Available",
			ContactName:           "Somchai",
			ContactPhone:          "0891234567",
		},
		{
			ID:                    uuid.New(),
			Code:                  "CUST-002",
			Name:                  "Lotus Rama IV",
			BusinessType:          "Retail",
			Address:               "Rama IV Road, Bangkok",
			Latitude:              13.7307,
			Longitude:             100.5418,
			Location:              "POINT(100.5418 13.7307)",
			TimeWindowStart:       "08:00",
			TimeWindowEnd:         "18:00",
			AvgServiceTimeMinutes: 20,
			AccessDifficulty:      "Medium",
			ParkingAvailability:   "Limited",
			ContactName:           "Suda",
			ContactPhone:          "0892345678",
		},
		{
			ID:                    uuid.New(),
			Code:                  "CUST-003",
			Name:                  "Big C Ratchadamri",
			BusinessType:          "Retail",
			Address:               "Ratchadamri Road, Bangkok",
			Latitude:              13.7440,
			Longitude:             100.5392,
			Location:              "POINT(100.5392 13.7440)",
			TimeWindowStart:       "10:00",
			TimeWindowEnd:         "19:00",
			AvgServiceTimeMinutes: 25,
			AccessDifficulty:      "Hard",
			ParkingAvailability:   "Very Limited",
			ContactName:           "Niran",
			ContactPhone:          "0893456789",
		},
		{
			ID:                    uuid.New(),
			Code:                  "CUST-004",
			Name:                  "Central World",
			BusinessType:          "Mall",
			Address:               "Ratchadamri Road, Pathum Wan, Bangkok",
			Latitude:              13.7469,
			Longitude:             100.5398,
			Location:              "POINT(100.5398 13.7469)",
			TimeWindowStart:       "07:00",
			TimeWindowEnd:         "16:00",
			AvgServiceTimeMinutes: 30,
			AccessDifficulty:      "Hard",
			ParkingAvailability:   "Very Limited",
			ContactName:           "Apinya",
			ContactPhone:          "0894567890",
		},
		{
			ID:                    uuid.New(),
			Code:                  "CUST-005",
			Name:                  "Siam Paragon",
			BusinessType:          "Mall",
			Address:               "Rama I Road, Pathum Wan, Bangkok",
			Latitude:              13.7465,
			Longitude:             100.5347,
			Location:              "POINT(100.5347 13.7465)",
			TimeWindowStart:       "08:00",
			TimeWindowEnd:         "17:00",
			AvgServiceTimeMinutes: 35,
			AccessDifficulty:      "Very Hard",
			ParkingAvailability:   "None",
			ContactName:           "Wichai",
			ContactPhone:          "0895678901",
		},
	}
	for _, c := range customers {
		if err := database.DB.Create(&c).Error; err != nil {
			log.Printf("⚠️ Failed to create customer %s: %v", c.Code, err)
		}
	}
	log.Println("✅ Finished creating customers")

	// Create orders
	now := time.Now()
	timePtr := func(t time.Time) *time.Time { return &t }

	orders := []models.Order{
		{
			ID:              uuid.New(),
			OrderNumber:     "ORD-1001",
			CustomerID:      customers[0].ID,
			PickupAddress:   realDepot.Address,
			DeliveryAddress: customers[0].Address,
			Status:          "pending",
			Priority:        "normal",
			WeightKg:        150.5,
			VolumeM3:        2.5,
			Items:           10,
			RequiredBy:      timePtr(now.Add(24 * time.Hour)),
		},
		{
			ID:              uuid.New(),
			OrderNumber:     "ORD-1002",
			CustomerID:      customers[1].ID,
			PickupAddress:   realDepot.Address,
			DeliveryAddress: customers[1].Address,
			Status:          "pending",
			Priority:        "high",
			WeightKg:        250.0,
			VolumeM3:        4.0,
			Items:           15,
			RequiredBy:      timePtr(now.Add(12 * time.Hour)),
		},
		{
			ID:              uuid.New(),
			OrderNumber:     "ORD-1003",
			CustomerID:      customers[2].ID,
			PickupAddress:   realDepot.Address,
			DeliveryAddress: customers[2].Address,
			Status:          "pending",
			Priority:        "normal",
			WeightKg:        180.0,
			VolumeM3:        3.0,
			Items:           12,
			RequiredBy:      timePtr(now.Add(24 * time.Hour)),
		},
		{
			ID:              uuid.New(),
			OrderNumber:     "ORD-1004",
			CustomerID:      customers[3].ID,
			PickupAddress:   realDepot.Address,
			DeliveryAddress: customers[3].Address,
			Status:          "pending",
			Priority:        "critical",
			WeightKg:        300.0,
			VolumeM3:        5.0,
			Items:           20,
			RequiredBy:      timePtr(now.Add(6 * time.Hour)),
		},
		{
			ID:              uuid.New(),
			OrderNumber:     "ORD-1005",
			CustomerID:      customers[4].ID,
			PickupAddress:   realDepot.Address,
			DeliveryAddress: customers[4].Address,
			Status:          "pending",
			Priority:        "high",
			WeightKg:        220.0,
			VolumeM3:        3.5,
			Items:           18,
			RequiredBy:      timePtr(now.Add(18 * time.Hour)),
		},
	}
	for _, o := range orders {
		if err := database.DB.Create(&o).Error; err != nil {
			log.Printf("⚠️ Failed to create order %s: %v", o.OrderNumber, err)
		}
	}
	log.Println("✅ Finished creating orders")

	log.Println("🎉 Database seeding completed!")
	log.Println("")
	log.Println("📝 Sample credentials:")
	log.Println("   Email: admin@ai-tms.com")
	log.Println("   Password: admin123")
}
