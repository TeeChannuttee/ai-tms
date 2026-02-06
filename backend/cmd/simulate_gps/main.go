package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

const (
	API_URL = "http://localhost:8080/api/v1/tracking/gps"
)

type GPSUpdateRequest struct {
	VehicleID string  `json:"vehicle_id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Speed     float64 `json:"speed"`
	Heading   float64 `json:"heading"`
}

// Simple path simulation (Bangkok area)
var routePath = [][2]float64{
	{13.7563, 100.5018}, // Depot
	{13.7580, 100.5050},
	{13.7600, 100.5100},
	{13.7650, 100.5200},
	{13.7700, 100.5300}, // Stop 1
	{13.7650, 100.5400},
	{13.7600, 100.5500},
	{13.7550, 100.5600}, // Stop 2
	{13.7500, 100.5500},
	{13.7450, 100.5400},
	{13.7400, 100.5300}, // Stop 3
	{13.7450, 100.5200},
	{13.7500, 100.5100},
	{13.7563, 100.5018}, // Return to Depot
}

func main() {
	// 1. Load env and connect to DB to get a valid vehicle ID
	godotenv.Load("D:/ai-tms/.env")
	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}

	var vehicle models.Vehicle
	if err := database.DB.First(&vehicle).Error; err != nil {
		log.Fatal("No vehicles found in database. Please create a vehicle first.")
	}

	fmt.Printf("🚀 Starting GPS Simulation for Vehicle: %s (ID: %s)\n", vehicle.LicensePlate, vehicle.ID)

	// Generate JWT token directly to avoid login issues
	// Assuming secret from env or default
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // Fallback to default
	}

	token := generateTestToken(jwtSecret, vehicle.ID.String())
	fmt.Printf("🔑 Generated Test Token for Vehicle %s\n", vehicle.LicensePlate)

	client := &http.Client{}

	// 2. Loop through path
	for {
		for i := 0; i < len(routePath); i++ {
			point := routePath[i]

			// Interpolate between points for smoother animation
			nextPoint := routePath[(i+1)%len(routePath)]
			steps := 20 // Slower animation (more steps)

			for step := 0; step < steps; step++ {
				alpha := float64(step) / float64(steps)
				lat := point[0] + (nextPoint[0]-point[0])*alpha
				lng := point[1] + (nextPoint[1]-point[1])*alpha

				payload := GPSUpdateRequest{
					VehicleID: vehicle.ID.String(),
					Latitude:  lat,
					Longitude: lng,
					Speed:     40.0 + math.Sin(float64(time.Now().Unix()))*10,
					Heading:   calculateHeading(point, nextPoint),
				}

				sendUpdate(client, payload, token)
				time.Sleep(200 * time.Millisecond) // Smooth update 5Hz
			}
		}
	}
}

func calculateHeading(p1, p2 [2]float64) float64 {
	// Simple heading calculation
	lat1, lon1 := p1[0]*math.Pi/180, p1[1]*math.Pi/180
	lat2, lon2 := p2[0]*math.Pi/180, p2[1]*math.Pi/180

	dLon := lon2 - lon1
	y := math.Sin(dLon) * math.Cos(lat2)
	x := math.Cos(lat1)*math.Sin(lat2) - math.Sin(lat1)*math.Cos(lat2)*math.Cos(dLon)
	brng := math.Atan2(y, x)
	return (brng*180/math.Pi + 360)
}

func generateTestToken(secret string, userID string) string {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    "admin",                               // Admin role for unrestricted access
		"exp":     time.Now().Add(22 * time.Hour).Unix(), // Reduced to 22 hours for testing
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Fatalf("Failed to sign token: %v", err)
	}
	return tokenString
}

func sendUpdate(client *http.Client, payload GPSUpdateRequest, token string) {
	data, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", API_URL, bytes.NewBuffer(data))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Failed to send update: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		fmt.Printf("📍 Update sent: %.4f, %.4f\r", payload.Latitude, payload.Longitude) // overwrite line
	} else {
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		fmt.Printf("\n⚠ API Error %d: %s\n", resp.StatusCode, buf.String())
	}
}
