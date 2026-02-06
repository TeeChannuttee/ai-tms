package main

import (
	"log"

	"github.com/ai-tms/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load("D:/ai-tms/.env")
	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}

	// Manually relax DriverID constraint just in case AutoMigrate didn't
	err := database.DB.Exec("ALTER TABLE routes ALTER COLUMN driver_id DROP NOT NULL").Error
	if err != nil {
		log.Printf("Note: ALTER TABLE failed (may already be nullable or table doesn't exist): %v", err)
	} else {
		log.Println("✅ Successfully ensured routes.driver_id is nullable")
	}
}
