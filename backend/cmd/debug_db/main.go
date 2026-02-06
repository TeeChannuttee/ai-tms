package main

import (
	"fmt"
	"log"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/joho/godotenv"
)

func main() {
	// Use absolute path for robustness
	envPath := "D:/ai-tms/.env"
	err := godotenv.Load(envPath)
	if err != nil {
		log.Printf("Warning: Failed to load .env from %s: %v", envPath, err)
	} else {
		log.Printf("✅ Loaded .env from: %s", envPath)
	}

	if err := database.Connect(); err != nil {
		log.Fatal("DB Connect error:", err)
	}

	var routesCount int64
	database.DB.Model(&models.Route{}).Count(&routesCount)
	fmt.Printf("DATABASE_CHECK: Routes=%d\n", routesCount)

	var orderCount int64
	database.DB.Model(&models.Order{}).Where("deleted_at IS NULL").Count(&orderCount)
	fmt.Printf("DATABASE_CHECK: Orders=%d\n", orderCount)

	var orders []models.Order
	database.DB.Select("id, order_number, status").Find(&orders)
	for _, o := range orders {
		fmt.Printf("   - Order %s: %s\n", o.OrderNumber, o.Status)
	}

	// Check for active orders
	var pendingOrderCount int64
	database.DB.Model(&models.Order{}).Where("status = ?", "pending").Count(&pendingOrderCount)
	fmt.Printf("\nDATABASE_CHECK: Pending Orders=%d\n", pendingOrderCount)

	if pendingOrderCount == 0 {
		fmt.Println("⚠ No pending orders found. Seeding 3 new pending orders for testing...")
		seedOrders()
	} else {
		fmt.Println("✅ Pending orders available for planning.")
	}

	var vehiclesCount int64
	database.DB.Model(&models.Vehicle{}).Count(&vehiclesCount)
	fmt.Printf("DATABASE_CHECK: Vehicles=%d\n", vehiclesCount)

	var driversCount int64
	database.DB.Model(&models.Driver{}).Count(&driversCount)
	fmt.Printf("DATABASE_CHECK: Drivers=%d\n", driversCount)

	var depotsCount int64
	database.DB.Model(&models.Depot{}).Count(&depotsCount)
	fmt.Printf("DATABASE_CHECK: Depots=%d\n", depotsCount)
}

func seedOrders() {
	// Create a dummy customer if needed
	var customer models.Customer
	if err := database.DB.First(&customer).Error; err != nil {
		customer = models.Customer{
			Code:      "CUST-TEST",
			Name:      "Test Customer",
			Address:   "123 Test St, Bangkok",
			Latitude:  13.7563,
			Longitude: 100.5018,
		}
		database.DB.Create(&customer)
	}

	// Create 3 orders
	for i := 1; i <= 3; i++ {
		pickup := time.Now().Add(24 * time.Hour)
		delivery := pickup.Add(2 * time.Hour)
		order := models.Order{
			OrderNumber:     fmt.Sprintf("ORD-TEST-%d-%d", time.Now().Unix(), i),
			CustomerID:      customer.ID,
			PickupAddress:   "Warehouse A",
			DeliveryAddress: fmt.Sprintf("Delivery Location %d", i),
			PickupTime:      &pickup,
			DeliveryTime:    &delivery,
			Status:          "pending",
			WeightKg:        float64(50 + i*10),
			RequiredBy:      &delivery,
		}
		database.DB.Create(&order)
		fmt.Printf("   + Created Order: %s\n", order.OrderNumber)
	}
}
