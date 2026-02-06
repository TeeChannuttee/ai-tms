package handlers

import (
	"net/http"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// ReplanRequest represents re-planning request
type ReplanRequest struct {
	EventType   string `json:"event_type" binding:"required"`
	VehicleID   string `json:"vehicle_id"`
	RouteID     string `json:"route_id"`
	Location    string `json:"location"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
}

// ReplanResponse represents re-planning response
type ReplanResponse struct {
	Alternatives []AlternativeDTO `json:"alternatives"`
	Recommended  string           `json:"recommended"`
}

// AlternativeDTO represents an alternative plan
type AlternativeDTO struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	TotalCost      float64  `json:"total_cost"`
	TotalDistance  float64  `json:"total_distance"`
	LateDeliveries int      `json:"late_deliveries"`
	ChangedStops   int      `json:"changed_stops"`
	Score          float64  `json:"score"`
	Pros           []string `json:"pros"`
	Cons           []string `json:"cons"`
}

// GenerateReplan handles dynamic re-planning
func GenerateReplan(c *gin.Context) {
	var req ReplanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current routes
	var currentRoutes []models.Route
	database.DB.Where("status IN ?", []string{"assigned", "in_progress"}).Find(&currentRoutes)

	// Get undelivered orders
	var orders []models.Order
	database.DB.Where("status NOT IN ?", []string{"delivered", "cancelled"}).Find(&orders)

	// Get available vehicles
	var vehicles []models.Vehicle
	database.DB.Where("status = ?", "available").Find(&vehicles)

	// Get depot
	var depot models.Depot
	database.DB.First(&depot)

	// Create event
	event := services.ReplanEvent{
		Type:        req.EventType,
		VehicleID:   req.VehicleID,
		RouteID:     req.RouteID,
		Location:    req.Location,
		Severity:    req.Severity,
		Description: req.Description,
	}

	// Generate alternatives
	replanner := services.NewReplanner()
	alternatives, err := replanner.GenerateAlternatives(event, currentRoutes, orders, vehicles, depot)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate alternatives"})
		return
	}

	// Convert to DTOs
	altDTOs := make([]AlternativeDTO, 0, len(alternatives))
	for _, alt := range alternatives {
		altDTOs = append(altDTOs, AlternativeDTO{
			ID:             alt.ID,
			Name:           alt.Name,
			Description:    alt.Description,
			TotalCost:      alt.TotalCost,
			TotalDistance:  alt.TotalDistance,
			LateDeliveries: alt.LateDeliveries,
			ChangedStops:   alt.ChangedStops,
			Score:          alt.Score,
			Pros:           alt.Pros,
			Cons:           alt.Cons,
		})
	}

	// Recommend best alternative (lowest score)
	recommended := altDTOs[0].ID
	lowestScore := altDTOs[0].Score
	for _, alt := range altDTOs {
		if alt.Score < lowestScore {
			recommended = alt.ID
			lowestScore = alt.Score
		}
	}

	response := ReplanResponse{
		Alternatives: altDTOs,
		Recommended:  recommended,
	}

	c.JSON(http.StatusOK, response)
}

// ApplyReplan applies a selected alternative
func ApplyReplan(c *gin.Context) {
	var req struct {
		AlternativeID string `json:"alternative_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// In production, implement actual plan application
	// This would update routes, notify drivers, etc.

	c.JSON(http.StatusOK, gin.H{
		"message":        "Re-plan applied successfully",
		"alternative_id": req.AlternativeID,
	})
}
