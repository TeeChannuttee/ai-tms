package services

import (
	"fmt"
	"math"
	"time"

	"github.com/ai-tms/backend/internal/models"
)

// VRPSolver handles vehicle routing problem optimization
type VRPSolver struct {
	orders   []models.Order
	vehicles []models.Vehicle
	depot    models.Depot
}

// RouteResult represents the result of route optimization
type RouteResult struct {
	VehicleID     string
	Stops         []RouteStop
	TotalDistance float64
	TotalDuration time.Duration
	TotalCost     float64
	Utilization   float64
}

// RouteStop represents a stop in the route
type RouteStop struct {
	OrderID       string
	CustomerID    string
	Location      string
	ArrivalTime   time.Time
	DepartureTime time.Time
	ServiceTime   time.Duration
	Distance      float64
}

// NewVRPSolver creates a new VRP solver instance
func NewVRPSolver(orders []models.Order, vehicles []models.Vehicle, depot models.Depot) *VRPSolver {
	return &VRPSolver{
		orders:   orders,
		vehicles: vehicles,
		depot:    depot,
	}
}

// Solve performs route optimization using a greedy nearest neighbor algorithm
// In production, this should use OR-Tools for optimal solutions
func (s *VRPSolver) Solve() ([]RouteResult, error) {
	if len(s.orders) == 0 {
		return nil, fmt.Errorf("no orders to optimize")
	}

	if len(s.vehicles) == 0 {
		return nil, fmt.Errorf("no vehicles available")
	}

	// Build distance matrix
	distanceMatrix := s.buildDistanceMatrix()

	// Initialize routes for each vehicle
	routes := make([]RouteResult, 0, len(s.vehicles))
	remainingOrders := make(map[string]models.Order)
	for _, order := range s.orders {
		remainingOrders[order.ID.String()] = order
	}

	// Assign orders to vehicles using greedy algorithm
	for _, vehicle := range s.vehicles {
		if len(remainingOrders) == 0 {
			break
		}

		route := s.buildRouteForVehicle(vehicle, remainingOrders, distanceMatrix)
		if len(route.Stops) > 0 {
			routes = append(routes, route)
		}
	}

	// Check if all orders were assigned
	if len(remainingOrders) > 0 {
		return routes, fmt.Errorf("could not assign %d orders (insufficient capacity or vehicles)", len(remainingOrders))
	}

	return routes, nil
}

// buildRouteForVehicle creates a route for a single vehicle
func (s *VRPSolver) buildRouteForVehicle(vehicle models.Vehicle, remainingOrders map[string]models.Order, distanceMatrix map[string]map[string]float64) RouteResult {
	route := RouteResult{
		VehicleID: vehicle.ID.String(),
		Stops:     make([]RouteStop, 0),
	}

	currentLocation := s.depot.Location
	currentTime := time.Now().Add(8 * time.Hour) // Start at 8 AM
	currentCapacity := 0.0

	// Greedy nearest neighbor algorithm
	for len(remainingOrders) > 0 {
		var nearestOrder *models.Order
		var nearestDistance float64 = math.MaxFloat64
		var nearestOrderID string

		// Find nearest order that fits capacity
		for id, order := range remainingOrders {
			// Check capacity constraint
			orderWeight := s.getOrderWeight(order)
			if currentCapacity+orderWeight > float64(vehicle.CapacityKg) {
				continue
			}

			// Calculate distance
			distance := s.getDistance(currentLocation, order.DeliveryAddress, distanceMatrix)
			if distance < nearestDistance {
				nearestDistance = distance
				nearestOrder = &order
				nearestOrderID = id
			}
		}

		// No more orders fit in this vehicle
		if nearestOrder == nil {
			break
		}

		// Add stop to route
		serviceTime := 15 * time.Minute                                                      // Default service time
		arrivalTime := currentTime.Add(time.Duration(nearestDistance/40.0*60) * time.Minute) // 40 km/h average
		departureTime := arrivalTime.Add(serviceTime)

		stop := RouteStop{
			OrderID:       nearestOrder.ID.String(),
			CustomerID:    nearestOrder.CustomerID.String(),
			Location:      nearestOrder.DeliveryAddress,
			ArrivalTime:   arrivalTime,
			DepartureTime: departureTime,
			ServiceTime:   serviceTime,
			Distance:      nearestDistance,
		}

		route.Stops = append(route.Stops, stop)
		route.TotalDistance += nearestDistance
		route.TotalDuration += time.Duration(nearestDistance/40.0*60)*time.Minute + serviceTime

		// Update state
		currentLocation = nearestOrder.DeliveryAddress
		currentTime = departureTime
		currentCapacity += s.getOrderWeight(*nearestOrder)

		// Remove assigned order
		delete(remainingOrders, nearestOrderID)
	}

	// Return to depot
	if len(route.Stops) > 0 {
		returnDistance := s.getDistance(currentLocation, s.depot.Location, distanceMatrix)
		route.TotalDistance += returnDistance
		route.TotalDuration += time.Duration(returnDistance/40.0*60) * time.Minute
	}

	// Calculate cost and utilization
	route.TotalCost = route.TotalDistance * vehicle.CostPerKm
	route.Utilization = (currentCapacity / float64(vehicle.CapacityKg)) * 100

	return route
}

// buildDistanceMatrix creates a distance matrix between all locations
func (s *VRPSolver) buildDistanceMatrix() map[string]map[string]float64 {
	matrix := make(map[string]map[string]float64)

	// Add depot
	locations := []string{s.depot.Location}

	// Add all order locations
	for _, order := range s.orders {
		locations = append(locations, order.DeliveryAddress)
	}

	// Calculate distances (using Haversine formula for now)
	// In production, use Google Maps Distance Matrix API
	for _, loc1 := range locations {
		matrix[loc1] = make(map[string]float64)
		for _, loc2 := range locations {
			if loc1 == loc2 {
				matrix[loc1][loc2] = 0
			} else {
				// Simple distance calculation (should use real geocoding)
				matrix[loc1][loc2] = s.calculateDistance(loc1, loc2)
			}
		}
	}

	return matrix
}

// getDistance retrieves distance from matrix
func (s *VRPSolver) getDistance(from, to string, matrix map[string]map[string]float64) float64 {
	if from == to {
		return 0
	}
	if dist, ok := matrix[from][to]; ok {
		return dist
	}
	return 10.0 // Default distance
}

// calculateDistance calculates approximate distance between two addresses
// This is a placeholder - in production, use geocoding + distance calculation
func (s *VRPSolver) calculateDistance(addr1, addr2 string) float64 {
	// Simple hash-based distance for demo
	// In production, geocode addresses and use Haversine formula
	hash1 := 0
	hash2 := 0
	for _, c := range addr1 {
		hash1 += int(c)
	}
	for _, c := range addr2 {
		hash2 += int(c)
	}
	return math.Abs(float64(hash1-hash2)) / 100.0
}

// getOrderWeight returns the weight/volume of an order
func (s *VRPSolver) getOrderWeight(order models.Order) float64 {
	// In production, this should come from order details
	return 1.0 // Default weight
}

// OptimizeWithConstraints performs optimization with additional constraints
func (s *VRPSolver) OptimizeWithConstraints(constraints VRPConstraints) ([]RouteResult, error) {
	// This is where OR-Tools would be integrated for optimal solutions
	// For now, use the greedy algorithm
	return s.Solve()
}

// VRPConstraints defines optimization constraints
type VRPConstraints struct {
	MaxStopsPerRoute    int
	MaxDistancePerRoute float64
	TimeWindows         map[string]TimeWindow
	DriverShifts        map[string]Shift
	VehicleTypes        map[string]string
}

// TimeWindow represents a delivery time window
type TimeWindow struct {
	Start time.Time
	End   time.Time
}

// Shift represents a driver's working shift
type Shift struct {
	Start time.Time
	End   time.Time
}
