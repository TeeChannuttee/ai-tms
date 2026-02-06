package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateOrderRequest represents order creation request
type CreateOrderRequest struct {
	CustomerID      string    `json:"customer_id" binding:"required"`
	PickupAddress   string    `json:"pickup_address"`
	DeliveryAddress string    `json:"delivery_address" binding:"required"`
	PickupTime      time.Time `json:"pickup_time"`
	DeliveryTime    time.Time `json:"delivery_time"`
	Priority        string    `json:"priority"`
	Notes           string    `json:"notes"`
}

// OrderDTO represents order data transfer object
type OrderDTO struct {
	ID              string    `json:"id"`
	OrderNumber     string    `json:"order_number"`
	CustomerID      string    `json:"customer_id"`
	CustomerName    string    `json:"customer_name,omitempty"`
	PickupAddress   string    `json:"pickup_address"`
	DeliveryAddress string    `json:"delivery_address"`
	PickupTime      time.Time `json:"pickup_time"`
	DeliveryTime    time.Time `json:"delivery_time"`
	Status          string    `json:"status"`
	Priority        string    `json:"priority"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
}

// CreateOrder creates a new order
func CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate order number
	orderNumber := "ORD-" + time.Now().Format("20060102") + "-" + uuid.New().String()[:8]

	order := models.Order{
		ID:              uuid.New(),
		OrderNumber:     orderNumber,
		CustomerID:      uuid.MustParse(req.CustomerID),
		PickupAddress:   req.PickupAddress,
		DeliveryAddress: req.DeliveryAddress,
		PickupTime:      &req.PickupTime,
		DeliveryTime:    &req.DeliveryTime,
		Status:          "pending",
		Priority:        req.Priority,
		Notes:           req.Notes,
	}

	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	var pickupTime, deliveryTime time.Time
	if order.PickupTime != nil {
		pickupTime = *order.PickupTime
	}
	if order.DeliveryTime != nil {
		deliveryTime = *order.DeliveryTime
	}

	c.JSON(http.StatusCreated, OrderDTO{
		ID:              order.ID.String(),
		OrderNumber:     order.OrderNumber,
		CustomerID:      order.CustomerID.String(),
		PickupAddress:   order.PickupAddress,
		DeliveryAddress: order.DeliveryAddress,
		PickupTime:      pickupTime,
		DeliveryTime:    deliveryTime,
		Status:          order.Status,
		Priority:        order.Priority,
		Notes:           order.Notes,
		CreatedAt:       order.CreatedAt,
	})
}

// ListOrders lists all orders with filters
func ListOrders(c *gin.Context) {
	status := c.Query("status")
	customerID := c.Query("customer_id")
	date := c.Query("date")

	query := database.DB.Preload("Customer")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if customerID != "" {
		query = query.Where("customer_id = ?", customerID)
	}

	if date != "" {
		parsedDate, err := time.Parse("2006-01-02", date)
		if err == nil {
			query = query.Where("DATE(delivery_time) = ?", parsedDate.Format("2006-01-02"))
		}
	}

	var orders []models.Order
	if err := query.Order("created_at DESC").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	orderDTOs := make([]OrderDTO, 0, len(orders))
	for _, order := range orders {
		var pickupTime, deliveryTime time.Time
		if order.PickupTime != nil {
			pickupTime = *order.PickupTime
		}
		if order.DeliveryTime != nil {
			deliveryTime = *order.DeliveryTime
		}

		dto := OrderDTO{
			ID:              order.ID.String(),
			OrderNumber:     order.OrderNumber,
			CustomerID:      order.CustomerID.String(),
			PickupAddress:   order.PickupAddress,
			DeliveryAddress: order.DeliveryAddress,
			PickupTime:      pickupTime,
			DeliveryTime:    deliveryTime,
			Status:          order.Status,
			Priority:        order.Priority,
			Notes:           order.Notes,
			CreatedAt:       order.CreatedAt,
		}

		if order.Customer != nil && order.Customer.Name != "" {
			dto.CustomerName = order.Customer.Name
		}

		orderDTOs = append(orderDTOs, dto)
	}

	c.JSON(http.StatusOK, orderDTOs)
}

// GetOrder retrieves a specific order
func GetOrder(c *gin.Context) {
	orderID := c.Param("id")

	var order models.Order
	if err := database.DB.Preload("Customer").First(&order, "id = ?", orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	var pickupTime, deliveryTime time.Time
	if order.PickupTime != nil {
		pickupTime = *order.PickupTime
	}
	if order.DeliveryTime != nil {
		deliveryTime = *order.DeliveryTime
	}

	customerName := ""
	if order.Customer != nil {
		customerName = order.Customer.Name
	}

	c.JSON(http.StatusOK, OrderDTO{
		ID:              order.ID.String(),
		OrderNumber:     order.OrderNumber,
		CustomerID:      order.CustomerID.String(),
		CustomerName:    customerName,
		PickupAddress:   order.PickupAddress,
		DeliveryAddress: order.DeliveryAddress,
		PickupTime:      pickupTime,
		DeliveryTime:    deliveryTime,
		Status:          order.Status,
		Priority:        order.Priority,
		Notes:           order.Notes,
		CreatedAt:       order.CreatedAt,
	})
}

// UpdateOrder updates an order
func UpdateOrder(c *gin.Context) {
	orderID := c.Param("id")

	var req struct {
		Status          string    `json:"status"`
		PickupAddress   string    `json:"pickup_address"`
		DeliveryAddress string    `json:"delivery_address"`
		PickupTime      time.Time `json:"pickup_time"`
		DeliveryTime    time.Time `json:"delivery_time"`
		Priority        string    `json:"priority"`
		Notes           string    `json:"notes"`
		CustomerID      string    `json:"customer_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.PickupAddress != "" {
		updates["pickup_address"] = req.PickupAddress
	}
	if req.DeliveryAddress != "" {
		updates["delivery_address"] = req.DeliveryAddress
	}
	if !req.PickupTime.IsZero() {
		updates["pickup_time"] = req.PickupTime
	}
	if !req.DeliveryTime.IsZero() {
		updates["delivery_time"] = req.DeliveryTime
	}
	if req.Priority != "" {
		updates["priority"] = req.Priority
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}
	if req.CustomerID != "" {
		updates["customer_id"] = req.CustomerID
	}

	if err := database.DB.Model(&models.Order{}).Where("id = ?", orderID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order updated successfully"})
}

// DeleteOrder cancels an order
func DeleteOrder(c *gin.Context) {
	orderID := c.Param("id")

	if err := database.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("status", "cancelled").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order cancelled successfully"})
}

// ImportOrders imports orders from CSV
func ImportOrders(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Open file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	// Parse CSV
	reader := csv.NewReader(src)
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CSV format"})
		return
	}

	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV file is empty"})
		return
	}

	// Skip header row
	imported := 0
	failed := 0

	for i, record := range records[1:] {
		if len(record) < 4 {
			failed++
			continue
		}

		// Parse customer ID
		customerID, err := uuid.Parse(record[0])
		if err != nil {
			failed++
			continue
		}

		// Parse delivery time
		deliveryTime, err := time.Parse("2006-01-02 15:04:05", record[3])
		if err != nil {
			deliveryTime = time.Now().Add(24 * time.Hour)
		}

		orderNumber := "ORD-" + time.Now().Format("20060102") + "-" + strconv.Itoa(i+1)

		order := models.Order{
			ID:              uuid.New(),
			OrderNumber:     orderNumber,
			CustomerID:      customerID,
			PickupAddress:   record[1],
			DeliveryAddress: record[2],
			DeliveryTime:    &deliveryTime,
			Status:          "pending",
			Priority:        "normal",
		}

		if err := database.DB.Create(&order).Error; err != nil {
			failed++
		} else {
			imported++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Import completed",
		"imported": imported,
		"failed":   failed,
	})
}

// TrackOrder allows customers to track their order
func TrackOrder(c *gin.Context) {
	orderNumber := c.Param("number")

	var order models.Order
	if err := database.DB.Preload("Customer").First(&order, "order_number = ?", orderNumber).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Get route stop if assigned
	var routeStop models.RouteStop
	var eta *time.Time
	var driverLocation *string

	if err := database.DB.Preload("Route.Driver").First(&routeStop, "order_id = ?", order.ID).Error; err == nil {
		eta = &routeStop.PlannedArrival
		// Get real-time driver location
		var gps models.GPSTracking
		if routeStop.Route != nil && routeStop.Route.VehicleID != uuid.Nil {
			if err := database.DB.Where("vehicle_id = ?", routeStop.Route.VehicleID).Order("timestamp DESC").First(&gps).Error; err == nil {
				loc := fmt.Sprintf("%f, %f", gps.Latitude, gps.Longitude)
				driverLocation = &loc
			}
		}
	}

	response := gin.H{
		"order_number":     order.OrderNumber,
		"status":           order.Status,
		"delivery_address": order.DeliveryAddress,
		"delivery_time":    order.DeliveryTime,
	}

	if eta != nil {
		response["eta"] = eta
	}

	if driverLocation != nil {
		response["driver_location"] = driverLocation
	}

	c.JSON(http.StatusOK, response)
}
