package handlers

import (
	"net/http"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// ListDriverAlerts handles GET /driver/alerts?driver_id=...
func ListDriverAlerts(c *gin.Context) {
	driverID := c.Query("driver_id")
	if driverID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "driver_id is required"})
		return
	}

	var alerts []models.Alert
	if err := database.DB.Where("driver_id = ? AND is_resolved = ?", driverID, false).
		Order("created_at DESC").
		Find(&alerts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch alerts"})
		return
	}

	c.JSON(http.StatusOK, alerts)
}

// MarkAlertRead handles PUT /alerts/:id/read
func MarkAlertRead(c *gin.Context) {
	alertID := c.Param("id")

	if err := database.DB.Model(&models.Alert{}).Where("id = ?", alertID).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update alert"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alert marked as read"})
}
