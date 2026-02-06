package services_test

import (
	"testing"

	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestVRPSolver(t *testing.T) {
	t.Run("Solve with valid input", func(t *testing.T) {
		// Create test data
		orders := []models.Order{
			{
				ID:              uuid.New(),
				DeliveryAddress: "Bangkok",
			},
			{
				ID:              uuid.New(),
				DeliveryAddress: "Nonthaburi",
			},
		}

		vehicles := []models.Vehicle{
			{
				ID:        uuid.New(),
				Capacity:  1000,
				CostPerKm: 5.0,
				Status:    "available",
			},
		}

		depot := models.Depot{
			ID:       uuid.New(),
			Location: "Depot A",
		}

		// Run solver
		solver := services.NewVRPSolver(orders, vehicles, depot)
		routes, err := solver.Solve()

		// Assertions
		assert.NoError(t, err)
		assert.NotEmpty(t, routes)
		assert.LessOrEqual(t, len(routes), len(vehicles))
	})

	t.Run("Solve with no orders", func(t *testing.T) {
		orders := []models.Order{}
		vehicles := []models.Vehicle{{ID: uuid.New()}}
		depot := models.Depot{ID: uuid.New()}

		solver := services.NewVRPSolver(orders, vehicles, depot)
		_, err := solver.Solve()

		assert.Error(t, err)
	})

	t.Run("Solve with no vehicles", func(t *testing.T) {
		orders := []models.Order{{ID: uuid.New()}}
		vehicles := []models.Vehicle{}
		depot := models.Depot{ID: uuid.New()}

		solver := services.NewVRPSolver(orders, vehicles, depot)
		_, err := solver.Solve()

		assert.Error(t, err)
	})
}

func TestReplanner(t *testing.T) {
	t.Run("Generate alternatives", func(t *testing.T) {
		event := services.ReplanEvent{
			Type:      "vehicle_breakdown",
			VehicleID: uuid.New().String(),
			Severity:  "high",
		}

		currentRoutes := []models.Route{}
		orders := []models.Order{{ID: uuid.New()}}
		vehicles := []models.Vehicle{{ID: uuid.New(), Capacity: 1000}}
		depot := models.Depot{ID: uuid.New(), Location: "Depot"}

		replanner := services.NewReplanner()
		alternatives, err := replanner.GenerateAlternatives(event, currentRoutes, orders, vehicles, depot)

		assert.NoError(t, err)
		assert.Equal(t, 3, len(alternatives)) // Should generate 3 alternatives
		assert.NotEmpty(t, alternatives[0].Name)
		assert.NotEmpty(t, alternatives[0].Pros)
		assert.NotEmpty(t, alternatives[0].Cons)
	})
}

func TestDelayAnalyzer(t *testing.T) {
	t.Run("Analyze delays", func(t *testing.T) {
		orders := []models.Order{
			{ID: uuid.New(), Status: "delivered"},
			{ID: uuid.New(), Status: "delivered"},
		}
		routes := []models.Route{}
		gpsData := []models.GPSTracking{}

		analyzer := services.NewDelayAnalyzer()
		analysis := analyzer.AnalyzeDelays(orders, routes, gpsData)

		assert.NotNil(t, analysis)
		assert.GreaterOrEqual(t, analysis.TotalDelays, 0)
		assert.NotEmpty(t, analysis.Recommendations)
	})
}

func TestMapsService(t *testing.T) {
	t.Skip("Skipping Maps API test - requires API key")

	t.Run("Get route", func(t *testing.T) {
		// This test requires actual Google Maps API key
		// Skip in CI/CD, run manually for integration testing
	})
}
