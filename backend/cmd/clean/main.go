package main

import (
	"log"

	"github.com/ai-tms/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	envPaths := []string{"../../.env", "../.env", ".env"}
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("✅ Loaded .env from: %s", path)
			break
		}
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("🧹 Clearing orders and routes...")

	// Truncate tables
	if err := database.DB.Exec("TRUNCATE TABLE route_stops, orders, routes CASCADE").Error; err != nil {
		log.Fatal("❌ Failed to truncate tables:", err)
	}

	log.Println("✅ Database cleared successfully!")
}
