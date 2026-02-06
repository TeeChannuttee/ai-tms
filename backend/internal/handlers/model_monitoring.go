package handlers

import (
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// ModelMonitoringHandler handles AI model monitoring endpoints
type ModelMonitoringHandler struct {
	service *services.ModelMonitoringService
}

// NewModelMonitoringHandler creates a new model monitoring handler
func NewModelMonitoringHandler() *ModelMonitoringHandler {
	return &ModelMonitoringHandler{
		service: services.NewModelMonitoringService(),
	}
}

// RegisterRoutes registers model monitoring routes
func (h *ModelMonitoringHandler) RegisterRoutes(router *gin.RouterGroup) {
	modelsGroup := router.Group("/models")
	{
		modelsGroup.GET("/:model_name/metrics", h.GetModelMetrics)
		modelsGroup.GET("/:model_name/drift", h.CheckDrift)
		modelsGroup.POST("/:model_name/calculate-daily", h.CalculateDailyMetrics)
	}
}

// GetModelMetrics retrieves metrics for a specific model
func (h *ModelMonitoringHandler) GetModelMetrics(c *gin.Context) {
	modelName := c.Param("model_name")
	// Simplified for prototype: always return last 100 records
	// daysStr := c.DefaultQuery("days", "7")

	// Parse days duration
	// days, err := time.ParseDuration(daysStr + "h24m0s") // hacky way to parse days if just number provided
	// Better: just assume days is int
	// ... simplification for prototype

	var metrics []models.ModelMetric
	// Get last 30 days max
	result := database.DB.Where("model_name = ?", modelName).
		Order("created_at DESC").
		Limit(100).
		Find(&metrics)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// CheckDrift triggers a drift check for a model
func (h *ModelMonitoringHandler) CheckDrift(c *gin.Context) {
	modelName := c.Param("model_name")

	driftDetected, err := h.service.DetectDrift(modelName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"model_name":     modelName,
		"drift_detected": driftDetected,
		"status":         "check_completed",
	})
}

// CalculateDailyMetrics triggers daily metric calculation
func (h *ModelMonitoringHandler) CalculateDailyMetrics(c *gin.Context) {
	modelName := c.Param("model_name")
	dateStr := c.Query("date")

	var date time.Time
	var err error

	if dateStr == "" {
		date = time.Now().Add(-24 * time.Hour) // Yesterday by default
	} else {
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
	}

	if err := h.service.CalculateDailyMetrics(date, modelName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Daily metrics calculated successfully",
		"date":    date.Format("2006-01-02"),
		"model":   modelName,
	})
}
