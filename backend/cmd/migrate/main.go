package main

import (
	"fmt"
	"log"
	"os"

	"github.com/ai-tms/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file - try multiple paths
	envPaths := []string{"../../.env", "../.env", ".env"}
	envLoaded := false
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("✅ Loaded .env from: %s", path)
			envLoaded = true
			break
		}
	}
	if !envLoaded {
		log.Println("⚠️  No .env file found, using system environment variables")
	}

	// Debug: Print loaded environment variables
	log.Printf("📝 Database config:")
	log.Printf("   POSTGRES_HOST=%s", os.Getenv("POSTGRES_HOST"))
	log.Printf("   POSTGRES_PORT=%s", os.Getenv("POSTGRES_PORT"))
	log.Printf("   POSTGRES_DB=%s", os.Getenv("POSTGRES_DB"))
	log.Printf("   POSTGRES_USER=%s", os.Getenv("POSTGRES_USER"))
	log.Printf("   POSTGRES_PASSWORD=%s", os.Getenv("POSTGRES_PASSWORD"))

	// Initialize database connection
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run unified migration logic (handles PostGIS, Enums, and Tables)
	if err := database.Migrate(); err != nil {
		log.Fatal("❌ Migration failed:", err)
	}

	// Create additional indexes
	createIndexes()

	fmt.Println("✅ All database setup completed!")
}

func createIndexes() {
	fmt.Println("📝 Creating indexes...")

	indexes := []string{
		// Core indexes
		"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
		"CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
		"CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);",
		"CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);",
		"CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);",
		"CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);",
		"CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);",
		"CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);",
		"CREATE INDEX IF NOT EXISTS idx_route_stops_order_id ON route_stops(order_id);",
		"CREATE INDEX IF NOT EXISTS idx_gps_tracking_vehicle_id ON gps_trackings(vehicle_id);",
		"CREATE INDEX IF NOT EXISTS idx_gps_tracking_timestamp ON gps_trackings(timestamp);",
		// Security & Governance indexes
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);",
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);",
		"CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);",
		"CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id ON idempotency_keys(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);",
		"CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_plan_versions_plan_id ON plan_versions(plan_id);",
		"CREATE INDEX IF NOT EXISTS idx_reassignment_logs_route_id ON reassignment_logs(route_id);",
		"CREATE INDEX IF NOT EXISTS idx_reassignment_logs_created_at ON reassignment_logs(created_at);",
		// AI Infrastructure indexes
		"CREATE INDEX IF NOT EXISTS idx_model_metrics_model_name ON model_metrics(model_name);",
		"CREATE INDEX IF NOT EXISTS idx_model_metrics_created_at ON model_metrics(created_at);",
		"CREATE INDEX IF NOT EXISTS idx_inference_logs_model_name ON inference_logs(model_name);",
		"CREATE INDEX IF NOT EXISTS idx_inference_logs_created_at ON inference_logs(created_at);",
		// Analytics indexes
		"CREATE INDEX IF NOT EXISTS idx_derived_signals_vehicle_id ON derived_signals(vehicle_id);",
		"CREATE INDEX IF NOT EXISTS idx_derived_signals_signal_type ON derived_signals(signal_type);",
		"CREATE INDEX IF NOT EXISTS idx_derived_signals_detected_at ON derived_signals(detected_at);",
	}

	for _, index := range indexes {
		if err := database.DB.Exec(index).Error; err != nil {
			log.Printf("Warning: Could not create index: %v", err)
		}
	}

	fmt.Println("✅ Indexes created")
}
