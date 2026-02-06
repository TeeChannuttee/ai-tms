package main

import (
	"fmt"
	"log"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/joho/godotenv"
)

func main() {
	// Connect to database
	// Try loading .env from parent directory
	// Use absolute path for robustness
	envPath := "D:/ai-tms/.env"
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️ Failed to load .env from %s: %v", envPath, err)
	} else {
		log.Printf("✅ Loaded .env from: %s", envPath)
	}

	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		log.Fatal("Failed to fetch users:", err)
	}

	fmt.Println("---------------------------------------------------")
	fmt.Printf("Total Users Found: %d\n", len(users))
	fmt.Println("---------------------------------------------------")
	for _, u := range users {
		fmt.Printf("ID: %s\nEmail: %s\nRole: %s\nName: %s\nPassHash: %s...\n", u.ID, u.Email, u.Role, u.Name, u.Password[:10])
		fmt.Println("---------------------------------------------------")
	}
}
