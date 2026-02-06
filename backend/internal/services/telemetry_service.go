package services

import (
	"fmt"
	"math"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/google/uuid"
)

// TelemetryService calculates derived signals from GPS tracking
type TelemetryService struct{}

// NewTelemetryService creates a new telemetry service
func NewTelemetryService() *TelemetryService {
	return &TelemetryService{}
}

// CalculateDwellTime calculates time spent at a stop
func (s *TelemetryService) CalculateDwellTime(stop *models.RouteStop) (float64, error) {
	if stop.ActualArrival == nil || stop.ActualDeparture == nil {
		return 0, fmt.Errorf("stop does not have both arrival and departure times")
	}

	dwellTime := stop.ActualDeparture.Sub(*stop.ActualArrival).Minutes()

	// Create derived signal
	signal := models.DerivedSignal{
		VehicleID:   stop.Route.VehicleID,
		RouteID:     &stop.RouteID,
		RouteStopID: &stop.ID,
		SignalType:  "dwell_time",
		Value:       dwellTime,
		Unit:        "minutes",
		Severity:    s.getDwellTimeSeverity(dwellTime, stop),
		Description: fmt.Sprintf("Dwell time at stop: %.1f minutes", dwellTime),
		DetectedAt:  *stop.ActualDeparture,
		CreatedAt:   time.Now(),
	}

	if err := database.DB.Create(&signal).Error; err != nil {
		return dwellTime, fmt.Errorf("failed to create dwell time signal: %w", err)
	}

	return dwellTime, nil
}

// getDwellTimeSeverity determines severity based on expected vs actual dwell time
func (s *TelemetryService) getDwellTimeSeverity(actualMinutes float64, stop *models.RouteStop) string {
	expectedMinutes := stop.PlannedDeparture.Sub(stop.PlannedArrival).Minutes()

	deviation := math.Abs(actualMinutes - expectedMinutes)

	if deviation > 30 {
		return "critical"
	} else if deviation > 15 {
		return "high"
	} else if deviation > 5 {
		return "medium"
	}
	return "low"
}

// CalculateRouteDeviation calculates distance from planned route
func (s *TelemetryService) CalculateRouteDeviation(vehicleID uuid.UUID, routeID uuid.UUID, lat, lng float64) error {
	// Get planned route polyline (simplified - in production, use actual polyline)
	var route models.Route
	if err := database.DB.Preload("RouteStops").First(&route, routeID).Error; err != nil {
		return fmt.Errorf("failed to load route: %w", err)
	}

	// Calculate deviation (simplified - use actual polyline distance calculation)
	deviation := s.calculateDeviationDistance(lat, lng, route)

	severity := "low"
	if deviation > 5000 { // 5km
		severity = "critical"
	} else if deviation > 2000 { // 2km
		severity = "high"
	} else if deviation > 500 { // 500m
		severity = "medium"
	}

	signal := models.DerivedSignal{
		VehicleID:   vehicleID,
		RouteID:     &routeID,
		SignalType:  "route_deviation",
		Value:       deviation,
		Unit:        "meters",
		Severity:    severity,
		Description: fmt.Sprintf("Vehicle deviated %.0f meters from planned route", deviation),
		DetectedAt:  time.Now(),
		CreatedAt:   time.Now(),
	}

	return database.DB.Create(&signal).Error
}

// calculateDeviationDistance calculates distance from current position to route
func (s *TelemetryService) calculateDeviationDistance(lat, lng float64, route models.Route) float64 {
	// Simplified calculation - in production, calculate distance to polyline
	// For now, just return 0 as placeholder
	return 0
}

// DetectSpeeding detects if vehicle is speeding
func (s *TelemetryService) DetectSpeeding(vehicleID uuid.UUID, routeID *uuid.UUID, speed float64, speedLimit float64) error {
	if speed <= speedLimit {
		return nil // Not speeding
	}

	excessSpeed := speed - speedLimit
	severity := "low"

	if excessSpeed > 40 {
		severity = "critical"
	} else if excessSpeed > 20 {
		severity = "high"
	} else if excessSpeed > 10 {
		severity = "medium"
	}

	signal := models.DerivedSignal{
		VehicleID:   vehicleID,
		RouteID:     routeID,
		SignalType:  "speeding",
		Value:       speed,
		Unit:        "km/h",
		Severity:    severity,
		Description: fmt.Sprintf("Vehicle speeding at %.1f km/h (limit: %.1f km/h)", speed, speedLimit),
		DetectedAt:  time.Now(),
		CreatedAt:   time.Now(),
	}

	return database.DB.Create(&signal).Error
}

// DetectSequenceViolation detects if stops are visited out of order
func (s *TelemetryService) DetectSequenceViolation(routeID uuid.UUID, completedStopSequence int) error {
	var stops []models.RouteStop
	if err := database.DB.Where("route_id = ?", routeID).
		Order("sequence ASC").
		Find(&stops).Error; err != nil {
		return fmt.Errorf("failed to load stops: %w", err)
	}

	// Check if any later stops were completed before this one
	for _, stop := range stops {
		if stop.Sequence > completedStopSequence &&
			stop.Status == string(StopStatusCompleted) &&
			stop.ActualDeparture != nil {

			signal := models.DerivedSignal{
				VehicleID:   stop.Route.VehicleID,
				RouteID:     &routeID,
				RouteStopID: &stop.ID,
				SignalType:  "sequence_violation",
				Value:       float64(completedStopSequence),
				Unit:        "sequence_number",
				Severity:    "high",
				Description: fmt.Sprintf("Stop %d completed before stop %d",
					stop.Sequence, completedStopSequence),
				DetectedAt: time.Now(),
				CreatedAt:  time.Now(),
			}

			return database.DB.Create(&signal).Error
		}
	}

	return nil
}

// CalculateLateness calculates how late a stop delivery is
func (s *TelemetryService) CalculateLateness(stop *models.RouteStop) (float64, error) {
	if stop.ActualArrival == nil {
		return 0, fmt.Errorf("stop does not have actual arrival time")
	}

	lateness := stop.ActualArrival.Sub(stop.PlannedArrival).Minutes()

	if lateness <= 0 {
		return 0, nil // On time or early
	}

	severity := "low"
	if lateness > 60 {
		severity = "critical"
	} else if lateness > 30 {
		severity = "high"
	} else if lateness > 15 {
		severity = "medium"
	}

	signal := models.DerivedSignal{
		VehicleID:   stop.Route.VehicleID,
		RouteID:     &stop.RouteID,
		RouteStopID: &stop.ID,
		SignalType:  "lateness",
		Value:       lateness,
		Unit:        "minutes",
		Severity:    severity,
		Description: fmt.Sprintf("Stop delivered %.1f minutes late", lateness),
		DetectedAt:  *stop.ActualArrival,
		CreatedAt:   time.Now(),
	}

	if err := database.DB.Create(&signal).Error; err != nil {
		return lateness, fmt.Errorf("failed to create lateness signal: %w", err)
	}

	return lateness, nil
}
