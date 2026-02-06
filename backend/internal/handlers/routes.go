package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GenerateRouteRequest represents the request to generate routes
type GenerateRouteRequest struct {
	OrderIDs   []string `json:"order_ids" binding:"required"`
	VehicleIDs []string `json:"vehicle_ids"`
	DepotID    string   `json:"depot_id" binding:"required"`
}

// GenerateRouteResponse represents the response from route generation
type GenerateRouteResponse struct {
	Routes           []RouteDTO `json:"routes"`
	TotalDistance    float64    `json:"total_distance"`
	TotalCost        float64    `json:"total_cost"`
	UnassignedOrders int        `json:"unassigned_orders"`
}

// RouteDTO represents a route data transfer object
type RouteDTO struct {
	ID            string    `json:"id"`
	VehicleID     string    `json:"vehicle_id"`
	VehicleNumber string    `json:"vehicle_number,omitempty"` // Added
	VehicleType   string    `json:"vehicle_type,omitempty"`   // Added
	DriverID      string    `json:"driver_id,omitempty"`
	DriverName    string    `json:"driver_name,omitempty"` // Added
	Stops         []StopDTO `json:"stops"`
	TotalDistance float64   `json:"total_distance"`
	TotalDuration int       `json:"total_duration_minutes"`
	TotalCost     float64   `json:"total_cost"`
	Utilization   float64   `json:"utilization"`
	Status        string    `json:"status"`
}

// StopDTO represents a route stop
type StopDTO struct {
	ID            string    `json:"id"`
	Sequence      int       `json:"sequence"`
	OrderID       string    `json:"order_id"`
	CustomerID    string    `json:"customer_id"`
	Address       string    `json:"address"`
	ArrivalTime   time.Time `json:"arrival_time"`
	DepartureTime time.Time `json:"departure_time"`
	ServiceTime   int       `json:"service_time_minutes"`
	Distance      float64   `json:"distance_km"`
	CustomerName  string    `json:"customer_name"`
	Status        string    `json:"status"`
}

// GenerateRoute handles route generation using VRP solver
func GenerateRoute(c *gin.Context) {
	var req GenerateRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch orders
	var orders []models.Order
	if err := database.DB.Where("id IN ?", req.OrderIDs).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	if len(orders) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid orders found"})
		return
	}

	// Fetch vehicles
	var vehicles []models.Vehicle
	query := database.DB
	if len(req.VehicleIDs) > 0 {
		query = query.Where("id IN ?", req.VehicleIDs)
	}
	if err := query.Where("status = ?", "available").Find(&vehicles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vehicles"})
		return
	}

	if len(vehicles) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No available vehicles found"})
		return
	}

	// Fetch depot
	var depot models.Depot
	if err := database.DB.First(&depot, "id = ?", req.DepotID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Depot not found"})
		return
	}

	// Run VRP solver
	solver := services.NewVRPSolver(orders, vehicles, depot)
	results, err := solver.Solve()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save routes to database
	routeDTOs := make([]RouteDTO, 0, len(results))
	totalDistance := 0.0
	totalCost := 0.0

	for _, result := range results {
		// Create route record
		route := models.Route{
			ID:            uuid.New(),
			VehicleID:     uuid.MustParse(result.VehicleID),
			DepotID:       depot.ID,
			Status:        "planned",
			TotalDistance: result.TotalDistance,
			TotalCost:     result.TotalCost,
			PlannedDate:   time.Now(),
		}

		if err := database.DB.Create(&route).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save route"})
			return
		}

		// Create route stops
		stops := make([]StopDTO, 0, len(result.Stops))
		for i, stop := range result.Stops {
			routeStop := models.RouteStop{
				ID:             uuid.New(),
				RouteID:        route.ID,
				OrderID:        uuid.MustParse(stop.OrderID),
				Sequence:       i + 1,
				PlannedArrival: stop.ArrivalTime,
				Status:         "pending",
			}

			if err := database.DB.Create(&routeStop).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save route stop"})
				return
			}

			stops = append(stops, StopDTO{
				ID:            routeStop.ID.String(),
				Sequence:      i + 1,
				OrderID:       stop.OrderID,
				CustomerID:    stop.CustomerID,
				Address:       stop.Location,
				ArrivalTime:   stop.ArrivalTime,
				DepartureTime: stop.DepartureTime,
				ServiceTime:   int(stop.ServiceTime.Minutes()),
				Distance:      stop.Distance,
			})
		}

		routeDTOs = append(routeDTOs, RouteDTO{
			ID:            route.ID.String(),
			VehicleID:     result.VehicleID,
			Stops:         stops,
			TotalDistance: result.TotalDistance,
			TotalDuration: int(result.TotalDuration.Minutes()),
			TotalCost:     result.TotalCost,
			Utilization:   result.Utilization,
			Status:        "planned",
		})

		totalDistance += result.TotalDistance
		totalCost += result.TotalCost
	}

	// Calculate unassigned orders
	assignedOrders := 0
	for _, route := range results {
		assignedOrders += len(route.Stops)
	}
	unassignedOrders := len(orders) - assignedOrders

	response := GenerateRouteResponse{
		Routes:           routeDTOs,
		TotalDistance:    totalDistance,
		TotalCost:        totalCost,
		UnassignedOrders: unassignedOrders,
	}

	c.JSON(http.StatusOK, response)
}

// GetRoute retrieves a specific route by ID
func GetRoute(c *gin.Context) {
	routeID := c.Param("id")

	var route models.Route
	if err := database.DB.Preload("Vehicle").Preload("Driver.User").First(&route, "id = ?", routeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		return
	}

	// Fetch route stops with Order and Customer
	var stops []models.RouteStop
	if err := database.DB.Preload("Order.Customer").Where("route_id = ?", routeID).Order("sequence").Find(&stops).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch route stops"})
		return
	}

	// Convert to DTO
	stopDTOs := make([]StopDTO, 0, len(stops))
	for _, stop := range stops {
		customerName := "Unknown Customer"
		if stop.Order != nil && stop.Order.Customer != nil {
			customerName = stop.Order.Customer.Name
		} else if stop.Order != nil {
			// Fallback if Customer is nil but Order exists (unlikely given FK)
			customerName = "Order " + stop.Order.OrderNumber
		}

		stopDTOs = append(stopDTOs, StopDTO{
			ID:           stop.ID.String(),
			Sequence:     stop.Sequence,
			OrderID:      stop.OrderID.String(),
			CustomerName: customerName,
			Address:      "Unknown Location", // You might want to grab this from Order.DeliveryAddress if Stop address is empty?
			// Actually RouteStop doesn't store address directly in model, it's computed or from Order.
			// Wait, StopDTO usually needs Address.
			// In GenerateRoute it comes from VRP. In GetRoute it comes from Model?
			// RouteStop model doesn't have Address field. It relies on Order.DeliveryAddress.
			ArrivalTime:   stop.PlannedArrival,
			DepartureTime: stop.PlannedArrival.Add(15 * time.Minute), // Default service time
			ServiceTime:   15,
			Status:        stop.Status,
		})
		// Fix Address:
		if stop.Order != nil {
			stopDTOs[len(stopDTOs)-1].Address = stop.Order.DeliveryAddress
		}
	}

	routeDTO := RouteDTO{
		ID:            route.ID.String(),
		VehicleID:     route.VehicleID.String(),
		Stops:         stopDTOs,
		TotalDistance: route.TotalDistance,
		TotalCost:     route.TotalCost,
		Status:        route.Status,
	}

	if route.DriverID != nil {
		routeDTO.DriverID = route.DriverID.String()
		if route.Driver != nil && route.Driver.User != nil {
			routeDTO.DriverName = route.Driver.User.Name
		}
	}
	if route.Vehicle != nil {
		routeDTO.VehicleNumber = route.Vehicle.LicensePlate
		routeDTO.VehicleType = route.Vehicle.Type
	}

	c.JSON(http.StatusOK, routeDTO)
}

// AssignRoute assigns a route to a driver
func AssignRoute(c *gin.Context) {
	routeID := c.Param("id")

	var req struct {
		DriverID string `json:"driver_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update route
	driverUUID := uuid.MustParse(req.DriverID)
	if err := database.DB.Model(&models.Route{}).Where("id = ?", routeID).Updates(map[string]interface{}{
		"driver_id": driverUUID,
		"status":    "assigned",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign route"})
		return
	}

	// 1. Fetch Driver/User name for notification
	var user models.User
	database.DB.First(&user, "id = ?", driverUUID)

	// 2. Log Audit Action
	if auditSvc != nil {
		senderID, _ := c.Get("userID") // Assume auth middleware sets this
		if sID, ok := senderID.(uuid.UUID); ok {
			auditSvc.LogRouteAction(sID, "assign_driver", uuid.MustParse(routeID), req.DriverID, c.ClientIP(), c.Request.UserAgent())
		}
	}

	// 3. Send LINE Notification
	if notificationSvc != nil {
		var stopCount int64
		database.DB.Model(&models.RouteStop{}).Where("route_id = ?", routeID).Count(&stopCount)
		notificationSvc.NotifyDriverAssignment(user.Name, routeID, int(stopCount))
	}

	c.JSON(http.StatusOK, gin.H{"message": "Route assigned successfully"})
}

// UpdateRoute updates route details
func UpdateRoute(c *gin.Context) {
	routeID := c.Param("id")

	var req struct {
		Status    string `json:"status"`
		Locked    *bool  `json:"locked"`
		VehicleID string `json:"vehicle_id"`
		DriverID  string `json:"driver_id"`
		Date      string `json:"date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Locked != nil {
		updates["locked"] = *req.Locked
	}
	if req.VehicleID != "" {
		if uid, err := uuid.Parse(req.VehicleID); err == nil {
			updates["vehicle_id"] = uid
		}
	}
	if req.DriverID != "" {
		if uid, err := uuid.Parse(req.DriverID); err == nil {
			updates["driver_id"] = uid
			updates["status"] = "assigned" // Auto assign status
		}
	}
	if req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", req.Date); err == nil {
			updates["date"] = parsed
			// Also update planned times basically (keep hour/minute, change date)
			// For MVP just changing date column is enough
		}
	}

	if err := database.DB.Model(&models.Route{}).Where("id = ?", routeID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update route"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Route updated successfully"})
}

// UpdateStopStatus updates the status of a specific stop (enroute, arrived, failed, etc.)
func UpdateStopStatus(c *gin.Context) {
	stopID := c.Param("id")

	var req struct {
		Status    string  `json:"status" binding:"required"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		Reason    string  `json:"reason"` // For "failed" status
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var stop models.RouteStop
	if err := database.DB.First(&stop, "id = ?", stopID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stop not found"})
		return
	}

	now := time.Now()
	updates := make(map[string]interface{})
	updates["status"] = req.Status

	switch req.Status {
	case "enroute":
		// Driver started moving to this stop
	case "arrived":
		updates["actual_arrival"] = &now
	case "delivered", "completed":
		updates["actual_departure"] = &now
	case "failed":
		updates["actual_departure"] = &now
	}

	if err := database.DB.Model(&stop).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stop status"})
		return
	}

	// Log Audit Action for critical status changes
	if auditSvc != nil && (req.Status == "delivered" || req.Status == "failed") {
		senderID, _ := c.Get("userID")
		if sID, ok := senderID.(uuid.UUID); ok {
			auditSvc.LogAction(sID, "update_stop_status", "route_stop", stop.ID, req.Status, c.ClientIP(), c.Request.UserAgent())
		}
	}

	// Broadcast event for real-time dashboard
	services.GetEventService().Broadcast(services.EventStatusUpdate, gin.H{
		"stop_id":  stopID,
		"status":   req.Status,
		"route_id": stop.RouteID,
		"order_id": stop.OrderID,
	})

	// Capture GPS in simple tracking if provided
	if req.Latitude != 0 && req.Longitude != 0 {
		var route models.Route
		if err := database.DB.First(&route, "id = ?", stop.RouteID).Error; err == nil {
			tracking := models.GPSTracking{
				ID:        uuid.New(),
				VehicleID: route.VehicleID,
				RouteID:   &stop.RouteID,
				Latitude:  req.Latitude,
				Longitude: req.Longitude,
				Timestamp: now,
			}
			database.DB.Create(&tracking)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stop status updated successfully", "status": req.Status})
}

// ListRoutes lists all routes with filters
func ListRoutes(c *gin.Context) {
	status := c.Query("status")
	date := c.Query("date")

	query := database.DB.Preload("Vehicle").Preload("Driver.User")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if date != "" {
		parsedDate, err := time.Parse("2006-01-02", date)
		if err == nil {
			query = query.Where("DATE(date) = ?", parsedDate.Format("2006-01-02"))
		}
	}

	driverID := c.Query("driver_id")
	if driverID != "" {
		query = query.Where("driver_id = ?", driverID)
	}

	var routes []models.Route
	// Preload Stops and their Orders/Customers
	if err := query.Preload("Vehicle").Preload("Driver.User").Find(&routes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch routes"})
		return
	}

	routeDTOs := make([]RouteDTO, 0, len(routes))
	for _, route := range routes {
		// Fetch stops for this route
		var stops []models.RouteStop
		if err := database.DB.Preload("Order.Customer").Where("route_id = ?", route.ID).Order("sequence").Find(&stops).Error; err != nil {
			// Skip or log error? For list, maybe just log and continue
			continue
		}

		stopDTOs := make([]StopDTO, 0, len(stops))
		for _, stop := range stops {
			customerName := "Unknown"
			address := "Unknown"
			if stop.Order != nil {
				address = stop.Order.DeliveryAddress
				if stop.Order.Customer != nil {
					customerName = stop.Order.Customer.Name
				}
			}

			stopDTOs = append(stopDTOs, StopDTO{
				ID:            stop.ID.String(),
				Sequence:      stop.Sequence,
				OrderID:       stop.OrderID.String(),
				CustomerName:  customerName,
				Address:       address,
				ArrivalTime:   stop.PlannedArrival,
				DepartureTime: stop.PlannedArrival.Add(15 * time.Minute),
				ServiceTime:   15,
				Status:        string(stop.Status),
			})
		}

		dto := RouteDTO{
			ID:            route.ID.String(),
			VehicleID:     route.VehicleID.String(),
			Stops:         stopDTOs,
			TotalDistance: route.TotalDistance,
			TotalCost:     route.TotalCost,
			Status:        route.Status,
		}
		if route.Vehicle == nil {
			fmt.Printf("DEBUG: Route %s has nil Vehicle (ID: %s)\n", route.ID, route.VehicleID)
		} else {
			fmt.Printf("DEBUG: Route %s Vehicle: %s\n", route.ID, route.Vehicle.LicensePlate)
			dto.VehicleNumber = route.Vehicle.LicensePlate
			dto.VehicleType = route.Vehicle.Type
		}
		if route.DriverID != nil {
			dto.DriverID = route.DriverID.String()
			if route.Driver != nil && route.Driver.User != nil {
				dto.DriverName = route.Driver.User.Name
			}
		}
		if route.Vehicle != nil {
			dto.VehicleNumber = route.Vehicle.LicensePlate
			dto.VehicleType = route.Vehicle.Type
		}
		routeDTOs = append(routeDTOs, dto)
	}

	c.JSON(http.StatusOK, routeDTOs)
}

// GetDriverStats returns summary statistics for a driver's today work
func GetDriverStats(c *gin.Context) {
	driverID := c.Query("driver_id")
	if driverID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "driver_id is required"})
		return
	}

	today := time.Now().Format("2006-01-02")
	var routes []models.Route
	if err := database.DB.Where("driver_id = ? AND DATE(date) = ?", driverID, today).Find(&routes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	totalStops := 0
	completedStops := 0

	for _, route := range routes {
		var stopsCount int64
		var doneCount int64
		database.DB.Model(&models.RouteStop{}).Where("route_id = ?", route.ID).Count(&stopsCount)
		database.DB.Model(&models.RouteStop{}).Where("route_id = ? AND status = ?", route.ID, "delivered").Count(&doneCount)
		totalStops += int(stopsCount)
		completedStops += int(doneCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"routes":    len(routes),
		"stops":     totalStops,
		"completed": completedStops,
		"risk":      "Low", // Placeholder for AI risk logic
	})
}

// StartRoute marks a route as in_progress
func StartRoute(c *gin.Context) {
	routeID := c.Param("id")
	now := time.Now()

	if err := database.DB.Model(&models.Route{}).Where("id = ?", routeID).Updates(map[string]interface{}{
		"status":            "in_progress",
		"actual_start_time": &now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start route"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Route started successfully", "start_time": now})
}

// AddStopToRoute manually adds an order to a route as a new stop
func AddStopToRoute(c *gin.Context) {
	routeIDStr := c.Param("id")
	var req struct {
		OrderID string `json:"order_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	routeID := uuid.MustParse(routeIDStr)
	orderID := uuid.MustParse(req.OrderID)

	// 1. Get current max sequence
	var maxSeq int
	database.DB.Model(&models.RouteStop{}).Where("route_id = ?", routeID).Select("COALESCE(MAX(sequence), 0)").Scan(&maxSeq)

	// 2. Create RouteStop
	stop := models.RouteStop{
		ID:             uuid.New(),
		RouteID:        routeID,
		OrderID:        orderID,
		Sequence:       maxSeq + 1,
		Status:         "pending",
		PlannedArrival: time.Now().Add(time.Hour), // Dummy planned time
	}

	if err := database.DB.Create(&stop).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stop"})
		return
	}

	// 3. Update order status
	database.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("status", "assigned")

	c.JSON(http.StatusOK, stop)
}

// CreateRoute manually creates a new empty route
func CreateRoute(c *gin.Context) {
	var req struct {
		VehicleID string `json:"vehicle_id" binding:"required"`
		DepotID   string `json:"depot_id" binding:"required"`
		Date      string `json:"date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date := time.Now()
	if req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", req.Date); err == nil {
			date = parsed
		}
	}

	route := models.Route{
		ID:               uuid.New(),
		RouteNumber:      "R-" + uuid.New().String()[:8],
		VehicleID:        uuid.MustParse(req.VehicleID),
		DepotID:          uuid.MustParse(req.DepotID),
		Date:             date,
		Status:           "planned",
		PlannedStartTime: date.Add(8 * time.Hour),  // Default 08:00
		PlannedEndTime:   date.Add(17 * time.Hour), // Default 17:00
	}

	if err := database.DB.Create(&route).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create route"})
		return
	}

	c.JSON(http.StatusCreated, route)
}

// RemoveStopFromRoute removes a stop from a route and resets order status to pending
func RemoveStopFromRoute(c *gin.Context) {
	routeIDStr := c.Param("id")
	stopIDStr := c.Param("stop_id")

	// Validate IDs
	routeID, err := uuid.Parse(routeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid route ID"})
		return
	}
	stopID, err := uuid.Parse(stopIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid stop ID"})
		return
	}

	// Start transaction
	tx := database.DB.Begin()

	// 1. Get the stop to find the OrderID
	var stop models.RouteStop
	if err := tx.Where("id = ? AND route_id = ?", stopID, routeID).First(&stop).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Stop not found in this route"})
		return
	}

	// 2. Delete the stop
	if err := tx.Delete(&stop).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete stop"})
		return
	}

	// 3. Update order status back to pending
	if err := tx.Model(&models.Order{}).Where("id = ?", stop.OrderID).Update("status", "pending").Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset order status"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Stop removed successfully", "order_id": stop.OrderID})
}

// DeleteRoute deletes a route and resets all associated orders to pending
func DeleteRoute(c *gin.Context) {
	routeIDStr := c.Param("id")
	routeID, err := uuid.Parse(routeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid route ID"})
		return
	}

	tx := database.DB.Begin()

	// 1. Get all stops to find order IDs
	var stops []models.RouteStop
	if err := tx.Where("route_id = ?", routeID).Find(&stops).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch route stops"})
		return
	}

	// 2. Reset order statuses to pending
	for _, stop := range stops {
		if err := tx.Model(&models.Order{}).Where("id = ?", stop.OrderID).Update("status", "pending").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset order status"})
			return
		}
	}

	// 3. Delete stops
	if err := tx.Where("route_id = ?", routeID).Delete(&models.RouteStop{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete route stops"})
		return
	}

	// 4. Delete route
	if err := tx.Where("id = ?", routeID).Delete(&models.Route{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete route"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Route deleted successfully"})
}
