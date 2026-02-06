package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GPSUpdateRequest represents GPS update data
type GPSUpdateRequest struct {
	VehicleID string  `json:"vehicle_id" binding:"required"`
	RouteID   string  `json:"route_id"`
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
	Speed     float64 `json:"speed"`
	Heading   float64 `json:"heading"`
}

// UpdateGPS handles GPS location updates
func UpdateGPS(c *gin.Context) {
	var req GPSUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create GPS tracking record
	location := fmt.Sprintf("POINT(%f %f)", req.Longitude, req.Latitude)

	// Parse and validate VehicleID
	vehicleID, err := uuid.Parse(req.VehicleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle_id format"})
		return
	}

	// Parse RouteID if provided
	var routeID *uuid.UUID
	if req.RouteID != "" && req.RouteID != "null" {
		parsed, err := uuid.Parse(req.RouteID)
		if err == nil {
			routeID = &parsed
		}
	}

	tracking := models.GPSTracking{
		ID:        uuid.New(),
		VehicleID: vehicleID,
		RouteID:   routeID,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Location:  location,
		SpeedKmh:  req.Speed,
		Heading:   int(req.Heading),
		Timestamp: time.Now(),
	}

	if err := database.DB.Create(&tracking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save GPS data"})
		return
	}

	// Publish to events service for real-time updates
	services.GetEventService().Broadcast(services.EventLocationUpdate, tracking)

	c.JSON(http.StatusOK, gin.H{
		"message":   "GPS updated successfully",
		"timestamp": tracking.Timestamp,
	})
}

// GetVehicleLocation retrieves current vehicle location
func GetVehicleLocation(c *gin.Context) {
	vehicleID := c.Param("id")

	var tracking models.GPSTracking
	if err := database.DB.Where("vehicle_id = ?", vehicleID).
		Order("timestamp DESC").
		First(&tracking).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No location data found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicle_id": tracking.VehicleID.String(),
		"location":   tracking.Location,
		"speed":      tracking.Speed,
		"heading":    tracking.Heading,
		"timestamp":  tracking.Timestamp,
	})
}

// GetRouteTracking retrieves GPS tracking for a route
func GetRouteTracking(c *gin.Context) {
	routeID := c.Param("id")

	// Get route with vehicle
	var route models.Route
	if err := database.DB.Preload("Vehicle").First(&route, "id = ?", routeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		return
	}

	// Get GPS history for the vehicle
	var trackingData []models.GPSTracking
	if err := database.DB.Where("vehicle_id = ?", route.VehicleID).
		Where("timestamp >= ?", route.PlannedDate).
		Order("timestamp ASC").
		Find(&trackingData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tracking data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"route_id":        routeID,
		"vehicle_id":      route.VehicleID.String(),
		"tracking_points": trackingData,
	})
}

// GetAllVehicleLocations retrieves the latest location for all active vehicles
// VehicleTrackingResponse combines vehicle info with latest tracking data
type VehicleTrackingResponse struct {
	VehicleID    uuid.UUID  `json:"vehicle_id"`
	LicensePlate string     `json:"license_plate"`
	VehicleType  string     `json:"vehicle_type"`
	Latitude     float64    `json:"latitude"`
	Longitude    float64    `json:"longitude"`
	SpeedKmh     float64    `json:"speed_kmh"`
	Heading      int        `json:"heading"`
	Timestamp    *time.Time `json:"timestamp"` // Pointer to handle null
	Status       string     `json:"status"`
}

// GetAllVehicleLocations retrieves all vehicles with their latest location (if any)
// GetAllVehicleLocations retrieves the latest location for all vehicles
func GetAllVehicleLocations(c *gin.Context) {
	var results []VehicleTrackingResponse

	// Optimized SQL to get the absolute latest tracking for each vehicle
	sql := `
		SELECT 
			v.id as vehicle_id,
			v.license_plate,
			v.vehicle_type,
			t.latitude,
			t.longitude,
			COALESCE(t.speed_kmh, 0) as speed_kmh,
			COALESCE(t.heading, 0) as heading,
			t.timestamp,
			CASE 
				WHEN v.current_driver_id IS NULL THEN 'offline'
				WHEN t.timestamp < NOW() - INTERVAL '2 minutes' THEN 'offline'
				WHEN t.speed_kmh > 2 THEN 'moving'
				ELSE 'stopped'
			END as status
		FROM vehicles v
		INNER JOIN (
			SELECT DISTINCT ON (vehicle_id) *
			FROM gps_trackings
			ORDER BY vehicle_id, timestamp DESC
		) t ON v.id = t.vehicle_id
		WHERE v.deleted_at IS NULL
	`

	if err := database.DB.Raw(sql).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tracking data"})
		return
	}

	c.JSON(http.StatusOK, results)
}
