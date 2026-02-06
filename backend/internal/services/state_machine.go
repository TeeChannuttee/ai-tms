package services

import (
	"fmt"
	"time"

	"github.com/ai-tms/backend/internal/models"
)

// OrderStatus represents valid order statuses
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusAssigned  OrderStatus = "assigned"
	OrderStatusPickedUp  OrderStatus = "picked_up"
	OrderStatusDelivered OrderStatus = "delivered"
	OrderStatusCancelled OrderStatus = "cancelled"
	OrderStatusFailed    OrderStatus = "failed"
)

// StopStatus represents valid stop statuses
type StopStatus string

const (
	StopStatusPending    StopStatus = "pending"
	StopStatusInProgress StopStatus = "in_progress"
	StopStatusCompleted  StopStatus = "completed"
	StopStatusFailed     StopStatus = "failed"
)

// OrderStateMachine handles order status transitions
type OrderStateMachine struct {
	validTransitions map[OrderStatus][]OrderStatus
}

// NewOrderStateMachine creates a new order state machine
func NewOrderStateMachine() *OrderStateMachine {
	return &OrderStateMachine{
		validTransitions: map[OrderStatus][]OrderStatus{
			OrderStatusPending: {
				OrderStatusAssigned,
				OrderStatusCancelled,
			},
			OrderStatusAssigned: {
				OrderStatusPickedUp,
				OrderStatusCancelled,
				OrderStatusPending, // Unassign
			},
			OrderStatusPickedUp: {
				OrderStatusDelivered,
				OrderStatusFailed,
			},
			OrderStatusDelivered: {
				// Terminal state
			},
			OrderStatusCancelled: {
				OrderStatusPending, // Reactivate
			},
			OrderStatusFailed: {
				OrderStatusPending, // Retry
			},
		},
	}
}

// CanTransition checks if a status transition is valid
func (sm *OrderStateMachine) CanTransition(from, to OrderStatus) bool {
	validNextStates, exists := sm.validTransitions[from]
	if !exists {
		return false
	}

	for _, validState := range validNextStates {
		if validState == to {
			return true
		}
	}

	return false
}

// ValidateTransition validates and returns error if invalid
func (sm *OrderStateMachine) ValidateTransition(from, to OrderStatus) error {
	if !sm.CanTransition(from, to) {
		return fmt.Errorf("invalid status transition from %s to %s", from, to)
	}
	return nil
}

// StopStateMachine handles stop status transitions
type StopStateMachine struct {
	validTransitions map[StopStatus][]StopStatus
}

// NewStopStateMachine creates a new stop state machine
func NewStopStateMachine() *StopStateMachine {
	return &StopStateMachine{
		validTransitions: map[StopStatus][]StopStatus{
			StopStatusPending: {
				StopStatusInProgress,
				StopStatusFailed,
			},
			StopStatusInProgress: {
				StopStatusCompleted,
				StopStatusFailed,
			},
			StopStatusCompleted: {
				// Terminal state (unless reopened by admin)
			},
			StopStatusFailed: {
				StopStatusPending, // Retry
			},
		},
	}
}

// CanTransition checks if a status transition is valid
func (sm *StopStateMachine) CanTransition(from, to StopStatus) bool {
	validNextStates, exists := sm.validTransitions[from]
	if !exists {
		return false
	}

	for _, validState := range validNextStates {
		if validState == to {
			return true
		}
	}

	return false
}

// ValidateTransition validates and returns error if invalid
func (sm *StopStateMachine) ValidateTransition(from, to StopStatus) error {
	if !sm.CanTransition(from, to) {
		return fmt.Errorf("invalid status transition from %s to %s", from, to)
	}
	return nil
}

// ValidateStopSequence ensures stops are completed in order
func ValidateStopSequence(stops []models.RouteStop, currentStopSequence int) error {
	// Find any completed stops with higher sequence numbers
	for _, stop := range stops {
		if stop.Sequence > currentStopSequence && stop.Status == string(StopStatusCompleted) {
			return fmt.Errorf("cannot complete stop %d: stop %d is already completed",
				currentStopSequence, stop.Sequence)
		}
	}

	// Check if previous stops are completed
	for _, stop := range stops {
		if stop.Sequence < currentStopSequence &&
			stop.Status != string(StopStatusCompleted) &&
			stop.Status != string(StopStatusFailed) {
			return fmt.Errorf("cannot complete stop %d: previous stop %d is not yet completed",
				currentStopSequence, stop.Sequence)
		}
	}

	return nil
}

// ValidateTimeWindow checks if delivery time is within customer's time window
func ValidateTimeWindow(customer *models.Customer, deliveryTime time.Time) error {
	if customer.TimeWindowStart == "" || customer.TimeWindowEnd == "" {
		return nil // No time window restriction
	}

	// Parse time window (format: "HH:MM")
	layout := "15:04"
	windowStart, err := time.Parse(layout, customer.TimeWindowStart)
	if err != nil {
		return fmt.Errorf("invalid time window start format: %w", err)
	}

	windowEnd, err := time.Parse(layout, customer.TimeWindowEnd)
	if err != nil {
		return fmt.Errorf("invalid time window end format: %w", err)
	}

	// Extract time from delivery time
	deliveryTimeOnly := time.Date(0, 1, 1,
		deliveryTime.Hour(), deliveryTime.Minute(), 0, 0, time.UTC)

	windowStartTime := time.Date(0, 1, 1,
		windowStart.Hour(), windowStart.Minute(), 0, 0, time.UTC)

	windowEndTime := time.Date(0, 1, 1,
		windowEnd.Hour(), windowEnd.Minute(), 0, 0, time.UTC)

	if deliveryTimeOnly.Before(windowStartTime) || deliveryTimeOnly.After(windowEndTime) {
		return fmt.Errorf("delivery time %s is outside customer time window %s-%s",
			deliveryTime.Format("15:04"),
			customer.TimeWindowStart,
			customer.TimeWindowEnd)
	}

	return nil
}
