package main

import (
	"log"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/joho/godotenv"
)

func main() {
	// Load ENV
	envPath := "D:/ai-tms/.env" // Absolute path
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️ Failed to load .env: %v", err)
	}

	// Connect DB
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	targetEmail := "driver001@ai-tms.com"

	log.Printf("🗑️ Attempting to delete user and data for: %s", targetEmail)

	// 1. Get User
	var user models.User
	if err := database.DB.Unscoped().Where("email = ?", targetEmail).First(&user).Error; err != nil {
		log.Printf("User not found or errors: %v", err)
		return
	}

	// 2. Delete Routes associated with this driver
	// Need to check routes where driver_id match. But first get driver profile.
	var driver models.Driver
	if err := database.DB.Unscoped().Where("user_id = ?", user.ID).First(&driver).Error; err == nil {
		log.Printf("Found driver profile: %s. Deleting related routes/stops...", driver.ID)

		// Delete Route Stops first (FK constraint)
		database.DB.Exec("DELETE FROM route_stops WHERE route_id IN (SELECT id FROM routes WHERE driver_id = ?)", driver.ID)

		// Delete Routes
		database.DB.Exec("DELETE FROM routes WHERE driver_id = ?", driver.ID)

		// Delete Driver Profile
		if err := database.DB.Unscoped().Delete(&driver).Error; err != nil {
			log.Printf("Error deleting driver profile: %v", err)
		} else {
			log.Println("✅ Deleted driver profile")
		}
	}

	// 3. Delete User
	if err := database.DB.Unscoped().Delete(&user).Error; err != nil {
		log.Printf("Error deleting user: %v", err)
	} else {
		log.Println("✅ Deleted User record")
	}

	log.Println("✨ Cleanup complete. You can now run the SEED script again.")
}
