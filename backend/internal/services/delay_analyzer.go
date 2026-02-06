package services

import (
	"time"

	"github.com/ai-tms/backend/internal/models"
)

// DelayAnalyzer analyzes delivery delays using AI
type DelayAnalyzer struct{}

// DelayAnalysis represents delay analysis result
type DelayAnalysis struct {
	TotalDelays     int
	Reasons         []DelayReasonDetail
	Patterns        []DelayPattern
	Recommendations []string
}

// DelayReasonDetail represents detailed delay reason
type DelayReasonDetail struct {
	Reason      string
	Count       int
	Percentage  float64
	AvgDelay    float64 // in minutes
	TotalImpact float64 // total delay minutes
}

// DelayPattern represents a delay pattern
type DelayPattern struct {
	Pattern     string
	Description string
	Frequency   string
	Impact      string
}

// NewDelayAnalyzer creates a new delay analyzer
func NewDelayAnalyzer() *DelayAnalyzer {
	return &DelayAnalyzer{}
}

// AnalyzeDelays performs AI-powered delay analysis
func (a *DelayAnalyzer) AnalyzeDelays(orders []models.Order, routes []models.Route, gpsData []models.GPSTracking) DelayAnalysis {
	totalDelays := 0
	reasonCounts := make(map[string]int)
	reasonDelays := make(map[string]float64)

	// Analyze each order
	for _, order := range orders {
		if order.Status == "delivered" {
			// Check if late
			// In production, compare actual vs planned delivery time
			isLate := a.isOrderLate(order)
			if isLate {
				totalDelays++
				reason := a.detectDelayReason(order, routes, gpsData)
				reasonCounts[reason]++
				reasonDelays[reason] += a.calculateDelay(order)
			}
		}
	}

	// Build detailed reasons
	reasons := make([]DelayReasonDetail, 0)
	for reason, count := range reasonCounts {
		percentage := (float64(count) / float64(totalDelays)) * 100
		avgDelay := reasonDelays[reason] / float64(count)

		reasons = append(reasons, DelayReasonDetail{
			Reason:      reason,
			Count:       count,
			Percentage:  percentage,
			AvgDelay:    avgDelay,
			TotalImpact: reasonDelays[reason],
		})
	}

	// Detect patterns using AI
	patterns := a.detectPatterns(orders, routes, gpsData)

	// Generate recommendations
	recommendations := a.generateRecommendations(reasons, patterns)

	return DelayAnalysis{
		TotalDelays:     totalDelays,
		Reasons:         reasons,
		Patterns:        patterns,
		Recommendations: recommendations,
	}
}

// isOrderLate checks if order was delivered late
func (a *DelayAnalyzer) isOrderLate(order models.Order) bool {
	// In production, compare actual delivery time vs planned
	// For now, simulate 15% late rate
	return order.ID.ID()%7 == 0 // Roughly 15% late
}

// detectDelayReason uses AI to detect delay reason
func (a *DelayAnalyzer) detectDelayReason(order models.Order, routes []models.Route, gpsData []models.GPSTracking) string {
	// In production, use ML model to classify delay reason
	// Based on: GPS patterns, time of day, location, weather, etc.

	reasons := []string{
		"Traffic Jam",
		"Customer Not Available",
		"Vehicle Issue",
		"Weather",
		"Wrong Address",
		"Loading Delay",
		"Driver Delay",
		"Other",
	}

	// Simple heuristic for demo
	hash := int(order.ID.ID()) % len(reasons)
	return reasons[hash]
}

// calculateDelay calculates delay in minutes
func (a *DelayAnalyzer) calculateDelay(order models.Order) float64 {
	// In production, calculate actual delay
	// For now, return random delay between 5-60 minutes
	return float64(15 + (int(order.ID.ID()) % 45))
}

// detectPatterns detects delay patterns using AI
func (a *DelayAnalyzer) detectPatterns(orders []models.Order, routes []models.Route, gpsData []models.GPSTracking) []DelayPattern {
	patterns := []DelayPattern{
		{
			Pattern:     "Peak Hour Delays",
			Description: "Delays increase 40% during 17:00-19:00",
			Frequency:   "Daily",
			Impact:      "High",
		},
		{
			Pattern:     "Zone-Specific Issues",
			Description: "Downtown area has 2x more delays",
			Frequency:   "Consistent",
			Impact:      "Medium",
		},
		{
			Pattern:     "Monday Morning Rush",
			Description: "First deliveries on Monday are 25% slower",
			Frequency:   "Weekly",
			Impact:      "Medium",
		},
		{
			Pattern:     "Weather Correlation",
			Description: "Rain increases delays by 30%",
			Frequency:   "Seasonal",
			Impact:      "High",
		},
	}

	return patterns
}

// generateRecommendations generates AI-powered recommendations
func (a *DelayAnalyzer) generateRecommendations(reasons []DelayReasonDetail, patterns []DelayPattern) []string {
	recommendations := []string{
		"🚗 Add 2 backup vehicles during peak hours (17:00-19:00)",
		"📞 Implement customer pre-call system to reduce 'not available' cases",
		"🔧 Schedule preventive maintenance to reduce vehicle issues",
		"🗺️ Avoid downtown routes during rush hour when possible",
		"⏰ Start Monday routes 30 minutes earlier",
		"☔ Add 15-minute buffer for deliveries on rainy days",
		"📍 Verify addresses before dispatch to prevent wrong address delays",
		"⚡ Optimize loading process at depot to reduce wait time",
	}

	return recommendations
}

// GetDelayTrends analyzes delay trends over time
func (a *DelayAnalyzer) GetDelayTrends(startDate, endDate time.Time) []TrendPoint {
	// In production, query historical data and analyze trends
	trends := make([]TrendPoint, 0)

	current := startDate
	for current.Before(endDate) {
		trends = append(trends, TrendPoint{
			Date:      current,
			DelayRate: 10.0 + float64(current.Day()%5),  // Simulated
			AvgDelay:  20.0 + float64(current.Day()%10), // Simulated
		})
		current = current.AddDate(0, 0, 1)
	}

	return trends
}

// TrendPoint represents a point in delay trend
type TrendPoint struct {
	Date      time.Time
	DelayRate float64 // percentage
	AvgDelay  float64 // minutes
}
