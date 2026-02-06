package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
)

// ModelMonitoringService handles AI model performance tracking and drift detection
type ModelMonitoringService struct{}

// NewModelMonitoringService creates a new model monitoring service
func NewModelMonitoringService() *ModelMonitoringService {
	return &ModelMonitoringService{}
}

// CalculateDailyMetrics calculates performance metrics for a specific model for a given day
func (s *ModelMonitoringService) CalculateDailyMetrics(date time.Time, modelName string) error {
	// Get start and end of day
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Get all inferences for the day
	var inferences []models.InferenceLog
	result := database.DB.Where("model_name = ? AND created_at >= ? AND created_at < ?", modelName, startOfDay, endOfDay).
		Find(&inferences)

	if result.Error != nil {
		return result.Error
	}

	if len(inferences) == 0 {
		return nil // No inferences to process
	}

	var totalLatency float64
	var errorCount int
	var predictions []float64

	for _, inf := range inferences {
		totalLatency += float64(inf.LatencyMs)
		if inf.Error != "" {
			errorCount++
		}

		// Simplified metric calculation based on model type
		// For a real implementation, we would need 'actuals' (ground truth) which usually comes later (e.g., from GPS tracks or POD)
		// For now, we'll extract predictions for statistical distribution checks
		if inf.Output != "" {
			var outputMap map[string]interface{}
			if err := json.Unmarshal([]byte(inf.Output), &outputMap); err == nil {
				// Try to find common prediction keys
				if val, ok := outputMap["predicted_minutes"].(float64); ok {
					predictions = append(predictions, val)
				} else if val, ok := outputMap["eta_minutes"].(float64); ok {
					predictions = append(predictions, val)
				}
			}
		}
	}

	avgLatency := totalLatency / float64(len(inferences))
	errorRate := float64(errorCount) / float64(len(inferences)) * 100

	// Store Avg Latency Metric
	latencyMetric := models.ModelMetric{
		ModelName:    modelName,
		ModelVersion: "latest", // Simplified
		MetricName:   "avg_latency_ms",
		MetricValue:  avgLatency,
		Metadata:     fmt.Sprintf(`{"sample_count": %d}`, len(inferences)),
		CreatedAt:    time.Now(),
	}
	if err := database.DB.Create(&latencyMetric).Error; err != nil {
		return err
	}

	// Store Error Rate Metric
	errorMetric := models.ModelMetric{
		ModelName:    modelName,
		ModelVersion: "latest",
		MetricName:   "error_rate_percent",
		MetricValue:  errorRate,
		Metadata:     fmt.Sprintf(`{"sample_count": %d}`, len(inferences)),
		CreatedAt:    time.Now(),
	}
	if err := database.DB.Create(&errorMetric).Error; err != nil {
		return err
	}

	// If we had actuals, we would calculate MAE/RMSE here
	// Since we don't have immediate ground truth in this async flow, we skip it for this MVP implementation

	return nil
}

// DetectDrift checks for significant changes in model performance or output distribution
func (s *ModelMonitoringService) DetectDrift(modelName string) (bool, error) {
	// Get last 7 days of latency metrics
	var metrics []models.ModelMetric
	database.DB.Where("model_name = ? AND metric_name = ? AND created_at > NOW() - INTERVAL '7 days'", modelName, "avg_latency_ms").
		Order("created_at DESC").
		Limit(7).
		Find(&metrics)

	if len(metrics) < 7 {
		return false, nil // Not enough data for baseline
	}

	// Calculate baseline (first 3 days of the window aka oldest data)
	// Note: metrics are ordered DESC, so indices 4,5,6 are oldest
	baselineLatency := (metrics[4].MetricValue + metrics[5].MetricValue + metrics[6].MetricValue) / 3

	// Calculate recent (last 3 days aka newest data)
	// Indices 0,1,2
	recentLatency := (metrics[0].MetricValue + metrics[1].MetricValue + metrics[2].MetricValue) / 3

	// Check for significant degradation (>50% increase in latency)
	driftThreshold := baselineLatency * 1.5

	if recentLatency > driftThreshold {
		// Create detailed alert description
		msg := fmt.Sprintf("Model %s showing latency degradation: avg latency increased from %.2fms to %.2fms",
			modelName, baselineLatency, recentLatency)

		// Create alert in database
		alert := models.Alert{
			Type:      "model_drift",
			Severity:  "high",
			Message:   msg,
			IsRead:    false,
			CreatedAt: time.Now(),
		}
		database.DB.Create(&alert)

		return true, nil
	}

	return false, nil
}
