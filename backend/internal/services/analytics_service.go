package services

import (
	"fmt"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/google/uuid"
)

// AnalyticsService handles KPI calculations and reporting
type AnalyticsService struct{}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService() *AnalyticsService {
	return &AnalyticsService{}
}

// CalculateDailyKPIs calculates and stores daily KPIs for a depot
func (s *AnalyticsService) CalculateDailyKPIs(date time.Time, depotID *uuid.UUID) error {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Build query
	query := database.DB.Model(&models.RouteStop{}).
		Joins("JOIN routes ON route_stops.route_id = routes.id").
		Where("routes.date >= ? AND routes.date < ?", startOfDay, endOfDay)

	if depotID != nil {
		query = query.Where("routes.depot_id = ?", depotID)
	}

	// Total jobs
	var totalJobs int64
	query.Count(&totalJobs)

	// Completed jobs
	var completedJobs int64
	database.DB.Model(&models.RouteStop{}).
		Joins("JOIN routes ON route_stops.route_id = routes.id").
		Where("routes.date >= ? AND routes.date < ?", startOfDay, endOfDay).
		Where("route_stops.status = ?", "completed").
		Count(&completedJobs)

	// Failed jobs
	var failedJobs int64
	database.DB.Model(&models.RouteStop{}).
		Joins("JOIN routes ON route_stops.route_id = routes.id").
		Where("routes.date >= ? AND routes.date < ?", startOfDay, endOfDay).
		Where("route_stops.status = ?", "failed").
		Count(&failedJobs)

	// On-time jobs (completed within 15 minutes of planned time)
	var onTimeJobs int64
	database.DB.Model(&models.RouteStop{}).
		Joins("JOIN routes ON route_stops.route_id = routes.id").
		Where("routes.date >= ? AND routes.date < ?", startOfDay, endOfDay).
		Where("route_stops.status = ?", "completed").
		Where("ABS(EXTRACT(EPOCH FROM (route_stops.actual_arrival - route_stops.planned_arrival))) <= 900"). // 15 minutes
		Count(&onTimeJobs)

	// Late jobs
	lateJobs := completedJobs - onTimeJobs

	// On-time rate
	var onTimeRate float64
	if completedJobs > 0 {
		onTimeRate = (float64(onTimeJobs) / float64(completedJobs)) * 100
	}

	// Total distance and cost
	var totalDistanceKm float64
	var totalCost float64
	database.DB.Model(&models.Route{}).
		Where("date >= ? AND date < ?", startOfDay, endOfDay).
		Select("COALESCE(SUM(total_distance_km), 0)").
		Scan(&totalDistanceKm)

	database.DB.Model(&models.Route{}).
		Where("date >= ? AND date < ?", startOfDay, endOfDay).
		Select("COALESCE(SUM(estimated_cost), 0)").
		Scan(&totalCost)

	// Cost per drop
	var costPerDrop float64
	if completedJobs > 0 {
		costPerDrop = totalCost / float64(completedJobs)
	}

	// Cost per km
	var costPerKm float64
	if totalDistanceKm > 0 {
		costPerKm = totalCost / totalDistanceKm
	}

	// Average service time
	var avgServiceTimeMin float64
	database.DB.Model(&models.RouteStop{}).
		Joins("JOIN routes ON route_stops.route_id = routes.id").
		Where("routes.date >= ? AND routes.date < ?", startOfDay, endOfDay).
		Where("route_stops.actual_arrival IS NOT NULL AND route_stops.actual_departure IS NOT NULL").
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (route_stops.actual_departure - route_stops.actual_arrival)) / 60), 0)").
		Scan(&avgServiceTimeMin)

	// Vehicle utilization (routes used / total vehicles)
	var routesCount int64
	database.DB.Model(&models.Route{}).
		Where("date >= ? AND date < ?", startOfDay, endOfDay).
		Count(&routesCount)

	var vehiclesCount int64
	database.DB.Model(&models.Vehicle{}).
		Where("status = ?", "active").
		Count(&vehiclesCount)

	var vehicleUtilization float64
	if vehiclesCount > 0 {
		vehicleUtilization = (float64(routesCount) / float64(vehiclesCount)) * 100
	}

	// POD completion rate
	var podsCount int64
	database.DB.Model(&models.ProofOfDelivery{}).
		Joins("JOIN route_stops ON proof_of_deliveries.route_stop_id = route_stops.id").
		Joins("JOIN routes ON route_stops.route_id = routes.id").
		Where("routes.date >= ? AND routes.date < ?", startOfDay, endOfDay).
		Count(&podsCount)

	var podCompletionRate float64
	if completedJobs > 0 {
		podCompletionRate = (float64(podsCount) / float64(completedJobs)) * 100
	}

	// Create or update daily KPI record
	dailyKPI := models.DailyKPI{
		Date:               startOfDay,
		DepotID:            depotID,
		TotalJobs:          int(totalJobs),
		CompletedJobs:      int(completedJobs),
		FailedJobs:         int(failedJobs),
		OnTimeJobs:         int(onTimeJobs),
		LateJobs:           int(lateJobs),
		OnTimeRate:         onTimeRate,
		TotalDistanceKm:    totalDistanceKm,
		TotalCost:          totalCost,
		CostPerDrop:        costPerDrop,
		CostPerKm:          costPerKm,
		AvgServiceTimeMin:  avgServiceTimeMin,
		VehicleUtilization: vehicleUtilization,
		PODCompletionRate:  podCompletionRate,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	// Check if record exists
	var existing models.DailyKPI
	result := database.DB.Where("date = ? AND depot_id IS NOT DISTINCT FROM ?", startOfDay, depotID).
		First(&existing)

	if result.Error == nil {
		// Update existing
		dailyKPI.ID = existing.ID
		return database.DB.Save(&dailyKPI).Error
	}

	// Create new
	return database.DB.Create(&dailyKPI).Error
}

// GetDailyKPIs retrieves daily KPIs for a date range
func (s *AnalyticsService) GetDailyKPIs(from, to time.Time, depotID *uuid.UUID) ([]models.DailyKPI, error) {
	query := database.DB.Model(&models.DailyKPI{}).
		Where("date >= ? AND date <= ?", from, to).
		Order("date DESC")

	if depotID != nil {
		query = query.Where("depot_id = ?", depotID)
	}

	var kpis []models.DailyKPI
	if err := query.Preload("Depot").Find(&kpis).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch daily KPIs: %w", err)
	}

	return kpis, nil
}

// GetKPITrends calculates trends over time
func (s *AnalyticsService) GetKPITrends(from, to time.Time, depotID *uuid.UUID) (map[string]interface{}, error) {
	kpis, err := s.GetDailyKPIs(from, to, depotID)
	if err != nil {
		return nil, err
	}

	if len(kpis) == 0 {
		return map[string]interface{}{
			"message": "No data available for the specified period",
		}, nil
	}

	// Calculate averages
	var totalOnTimeRate, totalVehicleUtil, totalPODRate float64
	var totalCost, totalDistance float64

	for _, kpi := range kpis {
		totalOnTimeRate += kpi.OnTimeRate
		totalVehicleUtil += kpi.VehicleUtilization
		totalPODRate += kpi.PODCompletionRate
		totalCost += kpi.TotalCost
		totalDistance += kpi.TotalDistanceKm
	}

	count := float64(len(kpis))

	return map[string]interface{}{
		"period": map[string]interface{}{
			"from": from,
			"to":   to,
			"days": len(kpis),
		},
		"averages": map[string]interface{}{
			"on_time_rate":        totalOnTimeRate / count,
			"vehicle_utilization": totalVehicleUtil / count,
			"pod_completion_rate": totalPODRate / count,
		},
		"totals": map[string]interface{}{
			"total_cost":        totalCost,
			"total_distance_km": totalDistance,
		},
		"daily_data": kpis,
	}, nil
}
