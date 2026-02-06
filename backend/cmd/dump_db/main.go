package main

import (
	"fmt"
	"log"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load("D:/ai-tms/.env")
	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("--- ROUTES ---")
	var routes []models.Route
	database.DB.Find(&routes)
	for _, r := range routes {
		fmt.Printf("ID: %s | Num: %s | Status: %s | Date: %s\n", r.ID, r.RouteNumber, r.Status, r.Date.Format("2006-01-02"))
	}

	fmt.Println("\n--- ORDERS ---")
	var orders []models.Order
	database.DB.Find(&orders)
	for _, o := range orders {
		fmt.Printf("ID: %s | Num: %s | Status: %s | Address: %s\n", o.ID, o.OrderNumber, o.Status, o.DeliveryAddress)
	}
}
