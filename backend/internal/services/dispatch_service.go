package services

import (
	"fmt"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/google/uuid"
)

// DispatchService handles route and stop reassignments
type DispatchService struct {
	auditService *AuditService
}

// NewDispatchService creates a new dispatch service
func NewDispatchService() *DispatchService {
	return &DispatchService{
		auditService: NewAuditService(),
	}
}

// ReassignmentReason represents common reassignment reasons
type ReassignmentReason string

const (
	ReasonVehicleBreakdown     ReassignmentReason = "vehicle_breakdown"
	ReasonDriverUnavailable    ReassignmentReason = "driver_unavailable"
	ReasonCustomerRequest      ReassignmentReason = "customer_request"
	ReasonTrafficDelay         ReassignmentReason = "traffic_delay"
	ReasonCapacityOptimization ReassignmentReason = "capacity_optimization"
	ReasonEmergency            ReassignmentReason = "emergency"
	ReasonOther                ReassignmentReason = "other"
)

// ReassignRouteRequest represents a route reassignment request
type ReassignRouteRequest struct {
	RouteID       uuid.UUID
	FromDriverID  *uuid.UUID
	ToDriverID    *uuid.UUID
	FromVehicleID *uuid.UUID
	ToVehicleID   *uuid.UUID
	Reason        ReassignmentReason
	Notes         string
	ReassignedBy  uuid.UUID
}

// ReassignRoute reassigns a route to a different driver/vehicle
func (s *DispatchService) ReassignRoute(req *ReassignRouteRequest) error {
	// Load route
	var route models.Route
	if err := database.DB.Preload("Driver").Preload("Vehicle").First(&route, req.RouteID).Error; err != nil {
		return fmt.Errorf("failed to load route: %w", err)
	}

	// Store old values
	oldDriverID := route.DriverID
	oldVehicleID := route.VehicleID

	// Update route
	if req.ToDriverID != nil {
		route.DriverID = req.ToDriverID
	}
	if req.ToVehicleID != nil {
		route.VehicleID = *req.ToVehicleID
	}

	if err := database.DB.Save(&route).Error; err != nil {
		return fmt.Errorf("failed to update route: %w", err)
	}

	// Create reassignment log
	reassignmentLog := models.ReassignmentLog{
		RouteID:       &req.RouteID,
		FromDriverID:  req.FromDriverID,
		ToDriverID:    req.ToDriverID,
		FromVehicleID: req.FromVehicleID,
		ToVehicleID:   req.ToVehicleID,
		Reason:        string(req.Reason),
		Notes:         req.Notes,
		ReassignedBy:  req.ReassignedBy,
		CreatedAt:     time.Now(),
	}

	if err := database.DB.Create(&reassignmentLog).Error; err != nil {
		return fmt.Errorf("failed to create reassignment log: %w", err)
	}

	// Log to audit
	changes := map[string]interface{}{
		"old_driver_id":  oldDriverID,
		"new_driver_id":  req.ToDriverID,
		"old_vehicle_id": oldVehicleID,
		"new_vehicle_id": req.ToVehicleID,
		"reason":         req.Reason,
	}

	s.auditService.LogAction(
		req.ReassignedBy,
		"route.reassign",
		"route",
		req.RouteID,
		changes,
		"", // IP will be set by middleware
		"", // User agent will be set by middleware
	)

	return nil
}

// ReassignStopRequest represents a stop reassignment request
type ReassignStopRequest struct {
	StopID       uuid.UUID
	FromRouteID  uuid.UUID
	ToRouteID    uuid.UUID
	NewSequence  int
	Reason       ReassignmentReason
	Notes        string
	ReassignedBy uuid.UUID
}

// ReassignStop moves a stop from one route to another
func (s *DispatchService) ReassignStop(req *ReassignStopRequest) error {
	// Load stop
	var stop models.RouteStop
	if err := database.DB.Preload("Route").First(&stop, req.StopID).Error; err != nil {
		return fmt.Errorf("failed to load stop: %w", err)
	}

	// Validate target route exists
	var toRoute models.Route
	if err := database.DB.First(&toRoute, req.ToRouteID).Error; err != nil {
		return fmt.Errorf("target route not found: %w", err)
	}

	// Store old values
	oldRouteID := stop.RouteID
	oldSequence := stop.Sequence

	// Update stop
	stop.RouteID = req.ToRouteID
	stop.Sequence = req.NewSequence

	if err := database.DB.Save(&stop).Error; err != nil {
		return fmt.Errorf("failed to update stop: %w", err)
	}

	// Resequence remaining stops in old route
	if err := s.resequenceRoute(oldRouteID); err != nil {
		return fmt.Errorf("failed to resequence old route: %w", err)
	}

	// Create reassignment log
	reassignmentLog := models.ReassignmentLog{
		RouteStopID:  &req.StopID,
		Reason:       string(req.Reason),
		Notes:        req.Notes,
		ReassignedBy: req.ReassignedBy,
		CreatedAt:    time.Now(),
	}

	if err := database.DB.Create(&reassignmentLog).Error; err != nil {
		return fmt.Errorf("failed to create reassignment log: %w", err)
	}

	// Log to audit
	changes := map[string]interface{}{
		"old_route_id": oldRouteID,
		"new_route_id": req.ToRouteID,
		"old_sequence": oldSequence,
		"new_sequence": req.NewSequence,
		"reason":       req.Reason,
	}

	s.auditService.LogAction(
		req.ReassignedBy,
		"stop.reassign",
		"stop",
		req.StopID,
		changes,
		"",
		"",
	)

	return nil
}

// resequenceRoute reorders stops in a route after a stop is removed
func (s *DispatchService) resequenceRoute(routeID uuid.UUID) error {
	var stops []models.RouteStop
	if err := database.DB.Where("route_id = ?", routeID).
		Order("sequence ASC").
		Find(&stops).Error; err != nil {
		return err
	}

	// Update sequences
	for i, stop := range stops {
		stop.Sequence = i + 1
		if err := database.DB.Save(&stop).Error; err != nil {
			return err
		}
	}

	return nil
}

// GetReassignmentHistory retrieves reassignment history for a route or stop
func (s *DispatchService) GetReassignmentHistory(routeID *uuid.UUID, stopID *uuid.UUID) ([]models.ReassignmentLog, error) {
	query := database.DB.Model(&models.ReassignmentLog{}).
		Preload("Reassigner").
		Preload("FromDriver").
		Preload("ToDriver").
		Preload("FromVehicle").
		Preload("ToVehicle").
		Order("created_at DESC")

	if routeID != nil {
		query = query.Where("route_id = ?", routeID)
	}
	if stopID != nil {
		query = query.Where("route_stop_id = ?", stopID)
	}

	var logs []models.ReassignmentLog
	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch reassignment history: %w", err)
	}

	return logs, nil
}
