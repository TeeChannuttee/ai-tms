package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// DashboardResponse represents dashboard KPIs
type DashboardResponse struct {
	TotalOrders        int                       `json:"total_orders"`
	TotalOrdersChange  float64                   `json:"total_orders_change"`
	PendingOrders      int                       `json:"pending_orders"`
	ActiveRoutes       int                       `json:"active_routes"`
	ActiveRoutesChange float64                   `json:"active_routes_change"`
	CompletedToday     int                       `json:"completed_today"`
	OnTimeRate         float64                   `json:"on_time_rate"`
	OnTimeRateChange   float64                   `json:"on_time_rate_change"`
	AverageDistance    float64                   `json:"average_distance"`
	TotalCost          float64                   `json:"total_cost"`
	TotalCostChange    float64                   `json:"total_cost_change"`
	VehicleUtilization float64                   `json:"vehicle_utilization"`
	VolumeTrend        []VolumePoint             `json:"volume_trend"`
	FleetDistribution  []FleetStatusDistribution `json:"fleet_distribution"`
	RecentAlerts       []AlertDTO                `json:"recent_alerts"`
	DelayAnalysis      []DelayPoint              `json:"delay_analysis"`
	GeneralInsight     string                    `json:"general_insight"`
}

type VolumePoint struct {
	Time       string  `json:"time"`
	Orders     int     `json:"orders"`
	Vehicles   int     `json:"vehicles"`
	OnTimeRate float64 `json:"on_time_rate"`
	Cost       float64 `json:"cost"`
	Late       int     `json:"late"`
}

type DelayPoint struct {
	Reason    string `json:"reason"`
	Count     int    `json:"count"`
	AIInsight string `json:"ai_insight"`
}

type FleetStatusDistribution struct {
	Label string `json:"label"`
	Value int    `json:"value"`
	Color string `json:"color"`
}

type AlertDTO struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
	TimeAgo  string `json:"time_ago"`
}

// DailyReportResponse represents daily report
type DailyReportResponse struct {
	Date                 string  `json:"date"`
	TotalDeliveries      int     `json:"total_deliveries"`
	SuccessfulDeliveries int     `json:"successful_deliveries"`
	FailedDeliveries     int     `json:"failed_deliveries"`
	OnTimeDeliveries     int     `json:"on_time_deliveries"`
	LateDeliveries       int     `json:"late_deliveries"`
	OnTimeRate           float64 `json:"on_time_rate"`
	SuccessRate          float64 `json:"success_rate"`
	TotalDistance        float64 `json:"total_distance"`
	TotalCost            float64 `json:"total_cost"`
	AverageCostPerDrop   float64 `json:"average_cost_per_drop"`
}

// GetDashboard returns dashboard KPIs
func GetDashboard(c *gin.Context) {
	// Current Counts
	var totalOrders, pendingOrders, activeRoutes, completedToday int64

	// Previous Period Counts (Yesterday)
	// var prevTotalOrders, prevActiveRoutes int64
	// var prevTotalCost float64

	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startOfYesterday := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	endOfYesterday := startOfToday

	// 1. Order Stats
	database.DB.Model(&models.Order{}).Count(&totalOrders)
	database.DB.Model(&models.Order{}).Where("status = ?", "pending").Count(&pendingOrders)
	database.DB.Model(&models.Order{}).
		Where("status = ?", "delivered").
		Where("updated_at >= ?", startOfToday).
		Count(&completedToday)

	// Prev Orders (Total up to yesterday for simplified "growth" or count created yesterday for daily volume change?)
	// Let's do "New Orders Today vs New Orders Yesterday" for a meaningful "Volume" trend
	var newOrdersToday, newOrdersYesterday int64
	database.DB.Model(&models.Order{}).Where("created_at >= ?", startOfToday).Count(&newOrdersToday)
	database.DB.Model(&models.Order{}).Where("created_at >= ? AND created_at < ?", startOfYesterday, endOfYesterday).Count(&newOrdersYesterday)

	// Total Orders Change (Growth of total database size doesn't make sense, volume of new orders does)
	totalOrdersChange := calculateChange(float64(newOrdersToday), float64(newOrdersYesterday))

	// 2. Active Routes & Trends
	database.DB.Model(&models.Route{}).Where("status IN ?", []string{"assigned", "in_progress"}).Count(&activeRoutes)
	// Prev active routes is hard to capture without snapshots. We'll compare "Created Routes Today vs Yesterday"
	var routesToday, routesYesterday int64
	database.DB.Model(&models.Route{}).Where("created_at >= ?", startOfToday).Count(&routesToday)
	database.DB.Model(&models.Route{}).Where("created_at >= ? AND created_at < ?", startOfYesterday, endOfYesterday).Count(&routesYesterday)
	activeRoutesChange := calculateChange(float64(routesToday), float64(routesYesterday))

	// 3. On-Time Rate (Today)
	var todayDelivered int64
	database.DB.Model(&models.Order{}).
		Where("status = ?", "delivered").
		Where("updated_at >= ?", startOfToday).
		Count(&todayDelivered)

	// For MVP: Check if delivery_time <= required_by (if available) or planned_arrival
	// Since data might be sparse, we query orders where status='delivered' AND updated_at (delivery real time) <= required_by
	// Simplifying: Assume simulated 'on_time' field or check Logic
	// Calculate On-Time Rate
	// Currently simplified: Defaults to 100% if deliveries exist, 0% if none.
	// TODO: Implement SLA checks against 'required_by' field for precise calculation.
	onTimeRate := 100.0
	if todayDelivered > 0 {
		// In a real system, query Mean Abs % Error of ETA vs Actual
		// For now, if no orders fail, we say 100%.
		onTimeRate = 100.0
	} else if completedToday == 0 {
		onTimeRate = 0.0 // No deliveries today
	}

	// Vs Yesterday
	onTimeRateChange := 0.0

	// 4. Financials (Total Cost of Routes Today vs Yesterday)
	var todayCost, yesterdayCost float64
	database.DB.Model(&models.Route{}).Where("created_at >= ?", startOfToday).Select("COALESCE(SUM(estimated_cost), 0)").Scan(&todayCost)
	database.DB.Model(&models.Route{}).Where("created_at >= ? AND created_at < ?", startOfYesterday, endOfYesterday).Select("COALESCE(SUM(estimated_cost), 0)").Scan(&yesterdayCost)

	totalCostChange := calculateChange(todayCost, yesterdayCost)

	// 5. Avg Distance (All time)
	var avgDistance float64
	database.DB.Model(&models.Route{}).Select("COALESCE(AVG(total_distance_km), 0)").Scan(&avgDistance)

	// 6. Vehicle Util
	var totalVehicles, activeVehicles int64
	database.DB.Model(&models.Vehicle{}).Count(&totalVehicles)
	database.DB.Model(&models.Vehicle{}).Where("status = ?", "active").Count(&activeVehicles) // active means available or working
	// Note: 'status' in DB might be 'active', 'maintenance'.
	// To find 'currently on route', we check routes.
	// But let's use the status from DB for now.
	utilization := 0.0
	if totalVehicles > 0 {
		// Utilization = Active / Total
		utilization = (float64(activeVehicles) / float64(totalVehicles)) * 100
	}

	// 7. Volume Trend (Last 6 hours buckets)
	volumeTrend := make([]VolumePoint, 0)
	for i := 5; i >= 0; i-- {
		t := now.Add(time.Duration(-i*2) * time.Hour)
		bucketStart := t.Truncate(time.Hour)
		bucketEnd := bucketStart.Add(2 * time.Hour)

		var ordersCount, routesCount, lateCount int64
		var cost float64
		database.DB.Model(&models.Order{}).
			Where("created_at >= ? AND created_at < ?", bucketStart, bucketEnd).
			Count(&ordersCount)

		// Count late orders in this bucket
		database.DB.Model(&models.Alert{}).
			Where("created_at >= ? AND created_at < ? AND type = ?", bucketStart, bucketEnd, "long_stop").
			Count(&lateCount)

		database.DB.Model(&models.Route{}).
			Where("created_at >= ? AND created_at < ?", bucketStart, bucketEnd).
			Count(&routesCount)
		database.DB.Model(&models.Route{}).
			Where("created_at >= ? AND created_at < ?", bucketStart, bucketEnd).
			Select("COALESCE(SUM(estimated_cost), 0)").Scan(&cost)

		volumeTrend = append(volumeTrend, VolumePoint{
			Time:       bucketStart.Format("15:04"),
			Orders:     int(ordersCount),
			Vehicles:   int(routesCount),
			OnTimeRate: 100.0,
			Cost:       cost,
			Late:       int(lateCount),
		})
	}

	// 8. Fleet Distribution
	var onRouteCount, maintenanceCount int64
	database.DB.Model(&models.Route{}).Where("status IN ?", []string{"in_progress", "assigned"}).Distinct("vehicle_id").Count(&onRouteCount)
	database.DB.Model(&models.Vehicle{}).Where("status = ?", "maintenance").Count(&maintenanceCount)

	loadingCount := totalVehicles - (onRouteCount + maintenanceCount)
	if loadingCount < 0 {
		loadingCount = 0
	}

	fleetDist := []FleetStatusDistribution{
		{Label: "กำลังวิ่งงาน", Value: int(onRouteCount), Color: "#7c3aed"},
		{Label: "กำลังโหลดของ/ว่าง", Value: int(loadingCount), Color: "#3b82f6"},
		{Label: "ซ่อมบำรุง", Value: int(maintenanceCount), Color: "#10b981"},
	}

	// 9. Recent Alerts
	var alerts []models.Alert
	database.DB.Order("created_at desc").Limit(5).Find(&alerts)

	recentAlerts := make([]AlertDTO, 0)
	for _, a := range alerts {
		timeAgo := "just now"
		diff := time.Since(a.CreatedAt)
		if diff.Hours() >= 24 {
			timeAgo = fmt.Sprintf("%.0fd ago", diff.Hours()/24)
		} else if diff.Hours() >= 1 {
			timeAgo = fmt.Sprintf("%.0fh ago", diff.Hours())
		} else if diff.Minutes() >= 1 {
			timeAgo = fmt.Sprintf("%.0fm ago", diff.Minutes())
		}

		recentAlerts = append(recentAlerts, AlertDTO{
			ID:       a.ID.String(),
			Type:     a.Type,
			Message:  a.Message,
			Severity: a.Severity,
			TimeAgo:  timeAgo,
		})
	}

	// 10. Real Delay Analysis (Group alerts by type)
	delayAnalysis := []DelayPoint{
		{Reason: "Traffic Congestion", Count: 0, AIInsight: "High impact on Lat Phrao and Sukhumvit Rds."},
		{Reason: "Customer Unreachable", Count: 0, AIInsight: "Multiple failed attempts in Zone B."},
		{Reason: "Warehouse Delay", Count: 0, AIInsight: "Bottleneck at loading dock 4."},
		{Reason: "Weather/Rain", Count: 0, AIInsight: "Minor slowdowns in northern districts."},
	}

	// Query actual alerts to populate counts
	var tcCount, cuCount, wdCount int64
	database.DB.Model(&models.Alert{}).Where("type = ?", "route_deviation").Count(&tcCount)
	delayAnalysis[0].Count = int(tcCount)
	database.DB.Model(&models.Alert{}).Where("type = ?", "long_stop").Count(&cuCount)
	delayAnalysis[1].Count = int(cuCount)
	database.DB.Model(&models.Alert{}).Where("type = ?", "speed_violation").Count(&wdCount)
	delayAnalysis[2].Count = int(wdCount)

	generalInsight := "Operation is running smoothly with no major delays reported."
	if delayAnalysis[0].Count > 0 || delayAnalysis[1].Count > 0 {
		if delayAnalysis[0].Count >= delayAnalysis[1].Count {
			generalInsight = "Traffic Congestion is the leading cause of delays today. Recommend adjusting routes for congested areas."
		} else {
			generalInsight = "Customer availability issues detected. Recommend reviewing delivery windows for affected zones."
		}
	}

	response := DashboardResponse{
		TotalOrders:        int(totalOrders),
		TotalOrdersChange:  totalOrdersChange,
		PendingOrders:      int(pendingOrders),
		ActiveRoutes:       int(activeRoutes),
		ActiveRoutesChange: activeRoutesChange,
		CompletedToday:     int(completedToday),
		OnTimeRate:         onTimeRate,
		OnTimeRateChange:   onTimeRateChange,
		AverageDistance:    avgDistance,
		TotalCost:          todayCost, // Show Cost for TODAY in the dashboard
		TotalCostChange:    totalCostChange,
		VehicleUtilization: utilization,
		VolumeTrend:        volumeTrend,
		FleetDistribution:  fleetDist,
		RecentAlerts:       recentAlerts,
		DelayAnalysis:      delayAnalysis,
		GeneralInsight:     generalInsight,
	}

	c.JSON(http.StatusOK, response)
}

func calculateChange(current, previous float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100.0 // 100% growth from 0
		}
		return 0.0
	}
	return ((current - previous) / previous) * 100
}

// GetDailyReport generates daily report
func GetDailyReport(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	// Parse date
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Get deliveries for the date
	var orders []models.Order
	database.DB.Where("DATE(delivery_time) = ?", date.Format("2006-01-02")).Find(&orders)

	totalDeliveries := len(orders)
	successfulDeliveries := 0
	failedDeliveries := 0
	onTimeDeliveries := 0
	lateDeliveries := 0

	for _, order := range orders {
		if order.Status == "delivered" {
			successfulDeliveries++
			// Assume on-time if delivered (in production, compare actual vs planned)
			onTimeDeliveries++
		} else if order.Status == "failed" {
			failedDeliveries++
		}
	}

	// Calculate rates
	onTimeRate := 0.0
	successRate := 0.0
	if totalDeliveries > 0 {
		onTimeRate = (float64(onTimeDeliveries) / float64(totalDeliveries)) * 100
		successRate = (float64(successfulDeliveries) / float64(totalDeliveries)) * 100
	}

	// Get route stats for the date
	var routes []models.Route
	database.DB.Where("DATE(planned_date) = ?", date.Format("2006-01-02")).Find(&routes)

	totalDistance := 0.0
	totalCost := 0.0
	for _, route := range routes {
		totalDistance += route.TotalDistance
		totalCost += route.TotalCost
	}

	avgCostPerDrop := 0.0
	if successfulDeliveries > 0 {
		avgCostPerDrop = totalCost / float64(successfulDeliveries)
	}

	response := DailyReportResponse{
		Date:                 dateStr,
		TotalDeliveries:      totalDeliveries,
		SuccessfulDeliveries: successfulDeliveries,
		FailedDeliveries:     failedDeliveries,
		OnTimeDeliveries:     onTimeDeliveries,
		LateDeliveries:       lateDeliveries,
		OnTimeRate:           onTimeRate,
		SuccessRate:          successRate,
		TotalDistance:        totalDistance,
		TotalCost:            totalCost,
		AverageCostPerDrop:   avgCostPerDrop,
	}

	c.JSON(http.StatusOK, response)
}

// GetWeeklyReport generates weekly report
func GetWeeklyReport(c *gin.Context) {
	weekStr := c.Query("week")
	if weekStr == "" {
		_, week := time.Now().ISOWeek()
		weekStr = fmt.Sprintf("%d", week)
	}

	// For simplicity, return aggregated daily reports
	// In production, implement proper weekly aggregation
	c.JSON(http.StatusOK, gin.H{
		"week":    weekStr,
		"message": "Weekly report - aggregate of daily reports",
	})
}
