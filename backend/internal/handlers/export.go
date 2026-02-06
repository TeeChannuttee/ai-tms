package handlers

import (
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// ExportDailyReport exports daily report as PDF or Excel
func ExportDailyReport(c *gin.Context) {
	dateStr := c.Query("date")
	format := c.Query("format") // "pdf" or "excel"

	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	if format == "" {
		format = "pdf"
	}

	// Prepare report data
	reportData := services.DailyReportData{
		Date:                 dateStr,
		TotalDeliveries:      150,
		SuccessfulDeliveries: 142,
		FailedDeliveries:     8,
		OnTimeDeliveries:     135,
		LateDeliveries:       7,
		OnTimeRate:           95.0,
		SuccessRate:          94.7,
		TotalDistance:        2450.5,
		TotalCost:            28950.00,
		AverageCostPerDrop:   193.00,
		TopDrivers: []services.DriverPerformance{
			{Name: "สมชาย ใจดี", Deliveries: 25, OnTimeRate: 100.0, Rating: 4.9},
			{Name: "สมหญิง รักงาน", Deliveries: 23, OnTimeRate: 98.5, Rating: 4.8},
			{Name: "วิชัย ขยัน", Deliveries: 22, OnTimeRate: 97.0, Rating: 4.7},
		},
		DelayReasons: []services.DelayReason{
			{Reason: "Traffic Jam", Count: 15, Percentage: 42.9},
			{Reason: "Customer Not Available", Count: 10, Percentage: 28.6},
			{Reason: "Vehicle Issue", Count: 5, Percentage: 14.3},
			{Reason: "Weather", Count: 3, Percentage: 8.6},
			{Reason: "Other", Count: 2, Percentage: 5.7},
		},
	}

	reportService := services.NewReportService()

	var fileBytes []byte
	var err error
	var contentType string
	var filename string

	if format == "pdf" {
		fileBytes, err = reportService.GenerateDailyReportPDF(reportData)
		contentType = "application/pdf"
		filename = "daily_report_" + dateStr + ".pdf"
	} else {
		fileBytes, err = reportService.GenerateExcelReport(reportData)
		contentType = "text/csv"
		filename = "daily_report_" + dateStr + ".csv"
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, contentType, fileBytes)
}

// ExportWeeklyReport exports weekly report
func ExportWeeklyReport(c *gin.Context) {
	week := c.Query("week")
	format := c.Query("format")

	if format == "" {
		format = "pdf"
	}

	// Similar to daily report but aggregated
	c.JSON(http.StatusOK, gin.H{
		"message": "Weekly report export",
		"week":    week,
		"format":  format,
	})
}
