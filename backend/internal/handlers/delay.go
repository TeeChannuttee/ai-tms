package handlers

import (
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// GetDelayAnalysis returns AI-powered delay analysis
func GetDelayAnalysis(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Parse dates
	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)

	if start.IsZero() {
		start = time.Now().AddDate(0, 0, -7) // Last 7 days
	}
	if end.IsZero() {
		end = time.Now()
	}

	// Get data
	var orders []models.Order
	database.DB.Where("delivery_time BETWEEN ? AND ?", start, end).Find(&orders)

	var routes []models.Route
	database.DB.Where("planned_date BETWEEN ? AND ?", start, end).Find(&routes)

	var gpsData []models.GPSTracking
	database.DB.Where("timestamp BETWEEN ? AND ?", start, end).Find(&gpsData)

	// Analyze delays
	analyzer := services.NewDelayAnalyzer()
	analysis := analyzer.AnalyzeDelays(orders, routes, gpsData)

	c.JSON(http.StatusOK, analysis)
}

// GetDelayTrends returns delay trends over time
func GetDelayTrends(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)

	if start.IsZero() {
		start = time.Now().AddDate(0, 0, -30) // Last 30 days
	}
	if end.IsZero() {
		end = time.Now()
	}

	analyzer := services.NewDelayAnalyzer()
	trends := analyzer.GetDelayTrends(start, end)

	c.JSON(http.StatusOK, trends)
}
