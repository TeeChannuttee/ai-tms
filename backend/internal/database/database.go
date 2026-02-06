package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ai-tms/backend/internal/models"
	_ "github.com/lib/pq" // PostgreSQL driver
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect establishes database connection
func Connect() error {
	// Use simple DSN format
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
	)

	log.Printf("🔗 Connecting to PostgreSQL at %s:%s/%s as %s",
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_DB"),
		os.Getenv("POSTGRES_USER"))

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("✅ Database connected successfully")
	return nil
}

// Migrate runs database migrations
func Migrate() error {
	log.Println("🔄 Running database migrations...")

	// Create PostGIS extension
	if err := DB.Exec("CREATE EXTENSION IF NOT EXISTS postgis").Error; err != nil {
		return fmt.Errorf("failed to create postgis extension: %w", err)
	}

	// Create UUID extension
	if err := DB.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		return fmt.Errorf("failed to create uuid-ossp extension: %w", err)
	}

	// Create custom enum types
	// Using DO block to check for existence before creating
	enumsSQL := `
	DO $$ 
	BEGIN
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
			CREATE TYPE user_role AS ENUM ('admin', 'planner', 'dispatcher', 'driver', 'customer');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
			CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'inactive');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
			CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'on_leave');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
			CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'picked_up', 'delivered', 'cancelled', 'failed');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
			CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'critical');
		END IF;
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
			CREATE TYPE delivery_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
		END IF;
	END $$;
	`
	if err := DB.Exec(enumsSQL).Error; err != nil {
		return fmt.Errorf("failed to create enums: %w", err)
	}

	// Manual Migration Fix: Convert text[] to jsonb if needed
	// This unblocks AutoMigrate when changing types
	fixColumnSQL := `
	DO $$ 
	BEGIN 
		IF EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'proof_of_deliveries' 
			AND column_name = 'photo_urls' 
			AND data_type = 'ARRAY'
		) THEN
			ALTER TABLE proof_of_deliveries 
			ALTER COLUMN photo_urls TYPE jsonb 
			USING to_jsonb(photo_urls);
		END IF;
	END $$;
	`
	if err := DB.Exec(fixColumnSQL).Error; err != nil {
		log.Printf("⚠️  Pre-migration fix failed (might be first run): %v", err)
	}

	err := DB.AutoMigrate(
		// Core models
		&models.User{},
		&models.Depot{},
		&models.Vehicle{},
		&models.Driver{},
		&models.Customer{},
		&models.Order{},
		&models.Route{},
		&models.RouteStop{},
		&models.GPSTracking{},
		&models.ProofOfDelivery{},
		&models.Alert{},
		&models.SLARule{},
		// Security & Governance models
		&models.AuditLog{},
		&models.IdempotencyKey{},
		&models.APIKey{},
		&models.PlanVersion{},
		&models.ReassignmentLog{},
		// AI Infrastructure models
		&models.ModelMetric{},
		&models.InferenceLog{},
		// Analytics models
		&models.DerivedSignal{},
		&models.DailyKPI{},
	)

	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Println("✅ Database migrations completed")
	return nil
}

// Close closes database connection
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
