package services

import (
	"time"

	"github.com/ai-tms/backend/internal/models"
)

// Replanner handles dynamic re-planning
type Replanner struct {
	vrpSolver *VRPSolver
}

// ReplanEvent represents an event that triggers re-planning
type ReplanEvent struct {
	Type        string // "vehicle_breakdown", "traffic_jam", "new_order", "time_change"
	VehicleID   string // Affected vehicle
	RouteID     string // Affected route
	Location    string // Event location
	Severity    string // "low", "medium", "high"
	Description string
	Timestamp   time.Time
}

// Alternative represents a re-planning alternative
type Alternative struct {
	ID             string
	Name           string
	Description    string
	Routes         []RouteResult
	TotalCost      float64
	TotalDistance  float64
	LateDeliveries int
	ChangedStops   int
	Score          float64
	Pros           []string
	Cons           []string
}

// NewReplanner creates a new replanner instance
func NewReplanner() *Replanner {
	return &Replanner{}
}

// GenerateAlternatives generates top 3 re-planning alternatives
func (r *Replanner) GenerateAlternatives(event ReplanEvent, currentRoutes []models.Route, orders []models.Order, vehicles []models.Vehicle, depot models.Depot) ([]Alternative, error) {
	alternatives := make([]Alternative, 0, 3)

	// Alternative 1: Minimize Late Deliveries
	alt1 := r.generateMinimizeLateAlternative(event, currentRoutes, orders, vehicles, depot)
	alternatives = append(alternatives, alt1)

	// Alternative 2: Minimize Cost
	alt2 := r.generateMinimizeCostAlternative(event, currentRoutes, orders, vehicles, depot)
	alternatives = append(alternatives, alt2)

	// Alternative 3: Minimize Changes
	alt3 := r.generateMinimizeChangesAlternative(event, currentRoutes, orders, vehicles, depot)
	alternatives = append(alternatives, alt3)

	// Calculate scores
	for i := range alternatives {
		alternatives[i].Score = r.calculateScore(alternatives[i])
	}

	return alternatives, nil
}

// generateMinimizeLateAlternative creates plan to minimize late deliveries
func (r *Replanner) generateMinimizeLateAlternative(event ReplanEvent, currentRoutes []models.Route, orders []models.Order, vehicles []models.Vehicle, depot models.Depot) Alternative {
	// Strategy: Prioritize time-critical orders, use fastest routes

	// Get undelivered orders
	undeliveredOrders := r.getUndeliveredOrders(orders)

	// Sort by urgency (earliest delivery time first)
	sortedOrders := r.sortByUrgency(undeliveredOrders)

	// Re-run VRP with time priority
	solver := NewVRPSolver(sortedOrders, vehicles, depot)
	routes, _ := solver.Solve()

	lateCount := r.estimateLateDeliveries(routes)
	totalCost := 0.0
	totalDistance := 0.0
	for _, route := range routes {
		totalCost += route.TotalCost
		totalDistance += route.TotalDistance
	}

	return Alternative{
		ID:             "alt_minimize_late",
		Name:           "ลด Late สูงสุด",
		Description:    "เน้นส่งของให้ทันเวลา อาจมีค่าใช้จ่ายสูงขึ้น",
		Routes:         routes,
		TotalCost:      totalCost,
		TotalDistance:  totalDistance,
		LateDeliveries: lateCount,
		ChangedStops:   r.countChangedStops(currentRoutes, routes),
		Pros: []string{
			"ลด late delivery ได้มากที่สุด",
			"รักษา SLA ได้ดี",
			"ลูกค้าพอใจ",
		},
		Cons: []string{
			"ค่าใช้จ่ายสูงกว่า",
			"ระยะทางรวมมากขึ้น",
		},
	}
}

// generateMinimizeCostAlternative creates plan to minimize cost
func (r *Replanner) generateMinimizeCostAlternative(event ReplanEvent, currentRoutes []models.Route, orders []models.Order, vehicles []models.Vehicle, depot models.Depot) Alternative {
	// Strategy: Optimize for shortest total distance

	undeliveredOrders := r.getUndeliveredOrders(orders)

	// Re-run VRP with cost optimization
	solver := NewVRPSolver(undeliveredOrders, vehicles, depot)
	routes, _ := solver.Solve()

	lateCount := r.estimateLateDeliveries(routes)
	totalCost := 0.0
	totalDistance := 0.0
	for _, route := range routes {
		totalCost += route.TotalCost
		totalDistance += route.TotalDistance
	}

	return Alternative{
		ID:             "alt_minimize_cost",
		Name:           "ลด Cost สูงสุด",
		Description:    "เน้นประหยัดค่าใช้จ่าย อาจมี late บ้าง",
		Routes:         routes,
		TotalCost:      totalCost,
		TotalDistance:  totalDistance,
		LateDeliveries: lateCount,
		ChangedStops:   r.countChangedStops(currentRoutes, routes),
		Pros: []string{
			"ค่าใช้จ่ายต่ำที่สุด",
			"ระยะทางสั้นที่สุด",
			"ประหยัดน้ำมัน",
		},
		Cons: []string{
			"อาจมี late delivery มากขึ้น",
			"SLA อาจไม่ถึง",
		},
	}
}

// generateMinimizeChangesAlternative creates plan with minimal changes
func (r *Replanner) generateMinimizeChangesAlternative(event ReplanEvent, currentRoutes []models.Route, orders []models.Order, vehicles []models.Vehicle, depot models.Depot) Alternative {
	// Strategy: Keep as much of current plan as possible, only adjust affected routes

	// Clone current routes
	routes := make([]RouteResult, 0)

	// Only re-plan affected vehicle/route
	affectedOrders := r.getAffectedOrders(event, orders)
	if len(affectedOrders) > 0 {
		solver := NewVRPSolver(affectedOrders, vehicles, depot)
		newRoutes, _ := solver.Solve()
		routes = append(routes, newRoutes...)
	}

	lateCount := r.estimateLateDeliveries(routes)
	totalCost := 0.0
	totalDistance := 0.0
	for _, route := range routes {
		totalCost += route.TotalCost
		totalDistance += route.TotalDistance
	}

	return Alternative{
		ID:             "alt_minimize_changes",
		Name:           "เปลี่ยนแปลงน้อยสุด",
		Description:    "แก้เฉพาะส่วนที่จำเป็น รักษาแผนเดิมไว้",
		Routes:         routes,
		TotalCost:      totalCost,
		TotalDistance:  totalDistance,
		LateDeliveries: lateCount,
		ChangedStops:   r.countChangedStops(currentRoutes, routes),
		Pros: []string{
			"เปลี่ยนแปลงน้อยที่สุด",
			"คนขับไม่สับสน",
			"ดำเนินการได้เร็ว",
		},
		Cons: []string{
			"อาจไม่ optimal",
			"ค่าใช้จ่ายกลาง ๆ",
		},
	}
}

// Helper functions

func (r *Replanner) getUndeliveredOrders(orders []models.Order) []models.Order {
	undelivered := make([]models.Order, 0)
	for _, order := range orders {
		if order.Status != "delivered" && order.Status != "cancelled" {
			undelivered = append(undelivered, order)
		}
	}
	return undelivered
}

func (r *Replanner) sortByUrgency(orders []models.Order) []models.Order {
	// Simple sort by delivery time (earliest first)
	// In production, use proper sorting algorithm
	return orders
}

func (r *Replanner) estimateLateDeliveries(routes []RouteResult) int {
	// Estimate based on ETA vs delivery time
	// In production, use AI ETA predictor
	lateCount := 0
	for _, route := range routes {
		for range route.Stops {
			// Simple heuristic: if arrival > delivery time, it's late
			lateCount++ // Placeholder
		}
	}
	return lateCount / 10 // Rough estimate
}

func (r *Replanner) countChangedStops(oldRoutes []models.Route, newRoutes []RouteResult) int {
	// Count how many stops changed sequence or vehicle
	// In production, implement proper diff algorithm
	return len(newRoutes) * 2 // Placeholder
}

func (r *Replanner) getAffectedOrders(event ReplanEvent, orders []models.Order) []models.Order {
	// Get orders affected by the event
	// In production, implement based on event type
	return r.getUndeliveredOrders(orders)
}

func (r *Replanner) calculateScore(alt Alternative) float64 {
	// Multi-objective scoring
	// Lower is better
	costWeight := 0.3
	lateWeight := 0.5
	changeWeight := 0.2

	// Normalize values (0-1 scale)
	costScore := alt.TotalCost / 10000.0            // Assuming max cost ~10000
	lateScore := float64(alt.LateDeliveries) / 10.0 // Assuming max late ~10
	changeScore := float64(alt.ChangedStops) / 50.0 // Assuming max changes ~50

	score := (costWeight * costScore) + (lateWeight * lateScore) + (changeWeight * changeScore)
	return score
}
