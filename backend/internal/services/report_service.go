package services

import (
	"bytes"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"
)

// ReportService handles report generation
type ReportService struct{}

// DailyReportData represents daily report data
type DailyReportData struct {
	Date                 string
	TotalDeliveries      int
	SuccessfulDeliveries int
	FailedDeliveries     int
	OnTimeDeliveries     int
	LateDeliveries       int
	OnTimeRate           float64
	SuccessRate          float64
	TotalDistance        float64
	TotalCost            float64
	AverageCostPerDrop   float64
	TopDrivers           []DriverPerformance
	DelayReasons         []DelayReason
}

// DriverPerformance represents driver performance
type DriverPerformance struct {
	Name       string
	Deliveries int
	OnTimeRate float64
	Rating     float64
}

// DelayReason represents delay analysis
type DelayReason struct {
	Reason     string
	Count      int
	Percentage float64
}

// NewReportService creates a new report service
func NewReportService() *ReportService {
	return &ReportService{}
}

// GenerateDailyReportPDF generates a PDF daily report
func (s *ReportService) GenerateDailyReportPDF(data DailyReportData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Add Thai font support (in production, add actual Thai font)
	pdf.SetFont("Arial", "B", 16)

	// Title
	pdf.Cell(190, 10, fmt.Sprintf("Daily Report - %s", data.Date))
	pdf.Ln(15)

	// Summary section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(190, 8, "Summary")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(95, 6, fmt.Sprintf("Total Deliveries: %d", data.TotalDeliveries))
	pdf.Cell(95, 6, fmt.Sprintf("Successful: %d", data.SuccessfulDeliveries))
	pdf.Ln(6)

	pdf.Cell(95, 6, fmt.Sprintf("On-Time Rate: %.1f%%", data.OnTimeRate))
	pdf.Cell(95, 6, fmt.Sprintf("Success Rate: %.1f%%", data.SuccessRate))
	pdf.Ln(6)

	pdf.Cell(95, 6, fmt.Sprintf("Total Distance: %.1f km", data.TotalDistance))
	pdf.Cell(95, 6, fmt.Sprintf("Total Cost: %.2f THB", data.TotalCost))
	pdf.Ln(6)

	pdf.Cell(95, 6, fmt.Sprintf("Avg Cost/Drop: %.2f THB", data.AverageCostPerDrop))
	pdf.Ln(12)

	// Top Drivers section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(190, 8, "Top Performers")
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(60, 6, "Driver")
	pdf.Cell(40, 6, "Deliveries")
	pdf.Cell(40, 6, "On-Time Rate")
	pdf.Cell(40, 6, "Rating")
	pdf.Ln(6)

	pdf.SetFont("Arial", "", 10)
	for _, driver := range data.TopDrivers {
		pdf.Cell(60, 6, driver.Name)
		pdf.Cell(40, 6, fmt.Sprintf("%d", driver.Deliveries))
		pdf.Cell(40, 6, fmt.Sprintf("%.1f%%", driver.OnTimeRate))
		pdf.Cell(40, 6, fmt.Sprintf("%.1f", driver.Rating))
		pdf.Ln(6)
	}
	pdf.Ln(6)

	// Delay Reasons section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(190, 8, "Delay Analysis")
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(80, 6, "Reason")
	pdf.Cell(40, 6, "Count")
	pdf.Cell(40, 6, "Percentage")
	pdf.Ln(6)

	pdf.SetFont("Arial", "", 10)
	for _, reason := range data.DelayReasons {
		pdf.Cell(80, 6, reason.Reason)
		pdf.Cell(40, 6, fmt.Sprintf("%d", reason.Count))
		pdf.Cell(40, 6, fmt.Sprintf("%.1f%%", reason.Percentage))
		pdf.Ln(6)
	}

	// Footer
	pdf.Ln(10)
	pdf.SetFont("Arial", "I", 8)
	pdf.Cell(190, 6, fmt.Sprintf("Generated: %s", time.Now().Format("2006-01-02 15:04:05")))

	// Output to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateExcelReport generates an Excel report
func (s *ReportService) GenerateExcelReport(data DailyReportData) ([]byte, error) {
	// In production, use a library like excelize
	// For now, return CSV format

	csv := fmt.Sprintf("Date,%s\n", data.Date)
	csv += fmt.Sprintf("Total Deliveries,%d\n", data.TotalDeliveries)
	csv += fmt.Sprintf("Successful,%d\n", data.SuccessfulDeliveries)
	csv += fmt.Sprintf("Failed,%d\n", data.FailedDeliveries)
	csv += fmt.Sprintf("On-Time Rate,%.2f%%\n", data.OnTimeRate)
	csv += fmt.Sprintf("Success Rate,%.2f%%\n", data.SuccessRate)
	csv += fmt.Sprintf("Total Distance,%.2f km\n", data.TotalDistance)
	csv += fmt.Sprintf("Total Cost,%.2f THB\n", data.TotalCost)
	csv += fmt.Sprintf("Avg Cost/Drop,%.2f THB\n", data.AverageCostPerDrop)

	csv += "\nTop Drivers\n"
	csv += "Name,Deliveries,On-Time Rate,Rating\n"
	for _, driver := range data.TopDrivers {
		csv += fmt.Sprintf("%s,%d,%.2f%%,%.1f\n", driver.Name, driver.Deliveries, driver.OnTimeRate, driver.Rating)
	}

	csv += "\nDelay Reasons\n"
	csv += "Reason,Count,Percentage\n"
	for _, reason := range data.DelayReasons {
		csv += fmt.Sprintf("%s,%d,%.2f%%\n", reason.Reason, reason.Count, reason.Percentage)
	}

	return []byte(csv), nil
}
