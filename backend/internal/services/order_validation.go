package services

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
)

// OrderValidationService handles order validation logic
type OrderValidationService struct{}

// NewOrderValidationService creates a new order validation service
func NewOrderValidationService() *OrderValidationService {
	return &OrderValidationService{}
}

// CheckDuplicateOrder checks if an order with same details already exists
func (s *OrderValidationService) CheckDuplicateOrder(order *models.Order) (bool, *models.Order, error) {
	// Generate order hash based on key fields
	orderHash := s.generateOrderHash(order)

	// Check if order with same hash exists within last 24 hours
	var existingOrder models.Order
	err := database.DB.Where("order_number = ?", order.OrderNumber).
		First(&existingOrder).Error

	if err == nil {
		// Found duplicate by order number
		return true, &existingOrder, nil
	}

	// Check by content hash (for orders without order number yet)
	var similarOrders []models.Order
	err = database.DB.Where("customer_id = ? AND delivery_address = ? AND created_at > NOW() - INTERVAL '24 hours'",
		order.CustomerID,
		order.DeliveryAddress).
		Find(&similarOrders).Error

	if err != nil {
		return false, nil, fmt.Errorf("failed to check duplicates: %w", err)
	}

	// Check if any similar order has matching hash
	for _, existing := range similarOrders {
		if s.generateOrderHash(&existing) == orderHash {
			return true, &existing, nil
		}
	}

	return false, nil, nil
}

// generateOrderHash creates a hash from order key fields
func (s *OrderValidationService) generateOrderHash(order *models.Order) string {
	data := fmt.Sprintf("%s|%s|%s|%.2f|%.2f|%d",
		order.CustomerID.String(),
		order.DeliveryAddress,
		order.PickupAddress,
		order.WeightKg,
		order.VolumeM3,
		order.Items,
	)

	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// ValidateOrderCapacity checks if order fits vehicle capacity
func (s *OrderValidationService) ValidateOrderCapacity(order *models.Order, vehicle *models.Vehicle) error {
	if order.WeightKg > float64(vehicle.CapacityKg) {
		return fmt.Errorf("order weight %.2f kg exceeds vehicle capacity %d kg",
			order.WeightKg, vehicle.CapacityKg)
	}

	if order.VolumeM3 > vehicle.CapacityM3 {
		return fmt.Errorf("order volume %.2f m³ exceeds vehicle capacity %.2f m³",
			order.VolumeM3, vehicle.CapacityM3)
	}

	return nil
}

// ValidateRouteCapacity checks if all orders in route fit vehicle capacity
func (s *OrderValidationService) ValidateRouteCapacity(route *models.Route, stops []models.RouteStop) error {
	var totalWeight float64
	var totalVolume float64

	for _, stop := range stops {
		if stop.Order != nil {
			totalWeight += stop.Order.WeightKg
			totalVolume += stop.Order.VolumeM3
		}
	}

	if route.Vehicle != nil {
		if totalWeight > float64(route.Vehicle.CapacityKg) {
			return fmt.Errorf("total route weight %.2f kg exceeds vehicle capacity %d kg",
				totalWeight, route.Vehicle.CapacityKg)
		}

		if totalVolume > route.Vehicle.CapacityM3 {
			return fmt.Errorf("total route volume %.2f m³ exceeds vehicle capacity %.2f m³",
				totalVolume, route.Vehicle.CapacityM3)
		}
	}

	return nil
}

// ValidatePriority ensures high-priority orders are handled correctly
func (s *OrderValidationService) ValidatePriority(order *models.Order) error {
	if order.Priority == "critical" || order.Priority == "high" {
		if order.RequiredBy == nil {
			return fmt.Errorf("high-priority orders must have a required_by deadline")
		}
	}

	return nil
}
