package handlers

import (
	"net/http"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// DriverDTO represents driver data transfer object
type DriverDTO struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Phone      string  `json:"phone"`
	Status     string  `json:"status"`
	Deliveries int     `json:"deliveries"`
	OnTimeRate float64 `json:"on_time_rate"`
	Rating     float64 `json:"rating"`
}

// ListDrivers lists all drivers with performance stats
func ListDrivers(c *gin.Context) {
	var drivers []models.Driver
	if err := database.DB.Preload("User").Find(&drivers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drivers"})
		return
	}

	driverDTOs := make([]DriverDTO, 0, len(drivers))
	for _, d := range drivers {
		var deliveries int64
		// Count real deliveries from ProofOfDelivery linked through RouteStop and Route
		database.DB.Table("proof_of_deliveries").
			Joins("JOIN route_stops ON route_stops.id = proof_of_deliveries.route_stop_id").
			Joins("JOIN routes ON routes.id = route_stops.route_id").
			Where("routes.driver_id = ?", d.ID).
			Count(&deliveries)

		onTimeRate := 100.0
		if deliveries > 0 {
			// Simplified on-time calculation: check if any delay alerts exist for these deliveries
			var lateCount int64
			database.DB.Model(&models.Alert{}).
				Where("driver_id = ? AND type = ?", d.ID, "long_stop").
				Count(&lateCount)

			if deliveries > 0 {
				onTimeRate = (float64(deliveries-lateCount) / float64(deliveries)) * 100
				if onTimeRate < 0 {
					onTimeRate = 0
				}
			}
		} else {
			onTimeRate = 0 // No deliveries yet
		}

		name := "Unknown Driver"
		phone := ""
		if d.User != nil {
			name = d.User.Name
			phone = d.User.Phone
		}

		driverDTOs = append(driverDTOs, DriverDTO{
			ID:         d.ID.String(),
			Name:       name,
			Phone:      phone,
			Status:     d.Status,
			Deliveries: int(deliveries),
			OnTimeRate: onTimeRate,
			Rating:     d.Rating,
		})
	}

	c.JSON(http.StatusOK, driverDTOs)
}
