package models

import (
	"time"

	"github.com/google/uuid"
)

// AuditLog represents a record of all critical system actions
type AuditLog struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	User       *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action     string    `gorm:"not null;index" json:"action"`      // e.g., "plan.publish", "stop.reassign", "order.create"
	EntityType string    `gorm:"not null;index" json:"entity_type"` // e.g., "plan", "route", "stop", "order"
	EntityID   uuid.UUID `gorm:"type:uuid;index" json:"entity_id"`
	Changes    string    `gorm:"type:jsonb" json:"changes"` // JSON of before/after state
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	CreatedAt  time.Time `gorm:"index" json:"created_at"`
}

// IdempotencyKey prevents duplicate requests from mobile apps
type IdempotencyKey struct {
	ID             uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Key            string    `gorm:"uniqueIndex;not null" json:"key"` // Client-provided idempotency key
	UserID         uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	User           *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Endpoint       string    `gorm:"not null" json:"endpoint"`        // API endpoint path
	RequestHash    string    `json:"request_hash"`                    // Hash of request body
	ResponseStatus int       `json:"response_status"`                 // HTTP status code
	ResponseBody   string    `gorm:"type:jsonb" json:"response_body"` // Cached response
	CreatedAt      time.Time `gorm:"index" json:"created_at"`
	ExpiresAt      time.Time `gorm:"index" json:"expires_at"` // Auto-delete after 24 hours
}

// APIKey represents an API key for external integrations
type APIKey struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Name        string     `gorm:"not null" json:"name"`          // Descriptive name
	KeyHash     string     `gorm:"uniqueIndex;not null" json:"-"` // SHA-256 hash of the key
	KeyPreview  string     `gorm:"-" json:"key_preview"`          // First 8 chars for display
	UserID      uuid.UUID  `gorm:"type:uuid;index" json:"user_id"`
	User        *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Permissions string     `gorm:"type:jsonb" json:"permissions"`  // JSON array of allowed actions
	RateLimit   int        `gorm:"default:1000" json:"rate_limit"` // Requests per hour
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	LastUsedAt  *time.Time `json:"last_used_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// PlanVersion represents a versioned snapshot of a plan
type PlanVersion struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	PlanID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"plan_id"` // Reference to Route (plan)
	Version     int        `gorm:"not null" json:"version"`                 // 1, 2, 3...
	Status      string     `gorm:"default:'draft'" json:"status"`           // draft, published, archived
	CreatedBy   uuid.UUID  `gorm:"type:uuid" json:"created_by"`
	Creator     *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	PublishedBy *uuid.UUID `gorm:"type:uuid" json:"published_by"`
	Publisher   *User      `gorm:"foreignKey:PublishedBy" json:"publisher,omitempty"`
	PublishedAt *time.Time `json:"published_at"`
	Reason      string     `json:"reason"`                              // Why this version was created
	Snapshot    string     `gorm:"type:jsonb;not null" json:"snapshot"` // JSON snapshot of routes/stops
	KPIs        string     `gorm:"type:jsonb" json:"kpis"`              // JSON of metrics (cost, distance, late_count, etc.)
	CreatedAt   time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// TableName specifies the table name for PlanVersion
func (PlanVersion) TableName() string {
	return "plan_versions"
}

// ModelMetric tracks AI model performance over time
type ModelMetric struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	ModelName    string    `gorm:"not null;index" json:"model_name"` // e.g., "eta_predictor", "anomaly_detector"
	ModelVersion string    `gorm:"not null" json:"model_version"`    // e.g., "v1.2.0"
	MetricName   string    `gorm:"not null" json:"metric_name"`      // e.g., "mae", "rmse", "precision"
	MetricValue  float64   `gorm:"not null" json:"metric_value"`
	Metadata     string    `gorm:"type:jsonb" json:"metadata"` // Additional context
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}

// InferenceLog records all AI model predictions
type InferenceLog struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	ModelName    string    `gorm:"not null;index" json:"model_name"`
	ModelVersion string    `gorm:"not null" json:"model_version"`
	InputSummary string    `gorm:"type:jsonb" json:"input_summary"` // Summarized input features
	Output       string    `gorm:"type:jsonb" json:"output"`        // Model prediction
	LatencyMs    int       `json:"latency_ms"`                      // Inference time in milliseconds
	Error        string    `json:"error"`                           // Error message if failed
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}

// DerivedSignal represents calculated metrics from GPS tracking
type DerivedSignal struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	VehicleID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"vehicle_id"`
	Vehicle     *Vehicle   `gorm:"foreignKey:VehicleID" json:"vehicle,omitempty"`
	RouteID     *uuid.UUID `gorm:"type:uuid;index" json:"route_id"`
	Route       *Route     `gorm:"foreignKey:RouteID" json:"route,omitempty"`
	RouteStopID *uuid.UUID `gorm:"type:uuid;index" json:"route_stop_id"`
	RouteStop   *RouteStop `gorm:"foreignKey:RouteStopID" json:"route_stop,omitempty"`
	SignalType  string     `gorm:"not null;index" json:"signal_type"` // dwell_time, deviation, speeding, sequence_violation
	Value       float64    `json:"value"`                             // Numeric value of the signal
	Unit        string     `json:"unit"`                              // e.g., "minutes", "meters", "km/h"
	Severity    string     `json:"severity"`                          // low, medium, high, critical
	Description string     `json:"description"`
	DetectedAt  time.Time  `gorm:"not null;index" json:"detected_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

// DailyKPI stores pre-aggregated daily metrics for fast dashboard queries
type DailyKPI struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Date               time.Time  `gorm:"not null;uniqueIndex:idx_daily_kpi_date_depot" json:"date"`
	DepotID            *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_daily_kpi_date_depot" json:"depot_id"`
	Depot              *Depot     `gorm:"foreignKey:DepotID" json:"depot,omitempty"`
	TotalJobs          int        `json:"total_jobs"`
	CompletedJobs      int        `json:"completed_jobs"`
	FailedJobs         int        `json:"failed_jobs"`
	OnTimeJobs         int        `json:"on_time_jobs"`
	LateJobs           int        `json:"late_jobs"`
	OnTimeRate         float64    `json:"on_time_rate"` // Percentage
	TotalDistanceKm    float64    `json:"total_distance_km"`
	TotalCost          float64    `json:"total_cost"`
	CostPerDrop        float64    `json:"cost_per_drop"`
	CostPerKm          float64    `json:"cost_per_km"`
	AvgServiceTimeMin  float64    `json:"avg_service_time_min"`
	VehicleUtilization float64    `json:"vehicle_utilization"` // Percentage
	PODCompletionRate  float64    `json:"pod_completion_rate"` // Percentage
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// ReassignmentLog tracks route/stop reassignments with reasons
type ReassignmentLog struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	RouteID       *uuid.UUID `gorm:"type:uuid;index" json:"route_id"`
	Route         *Route     `gorm:"foreignKey:RouteID" json:"route,omitempty"`
	RouteStopID   *uuid.UUID `gorm:"type:uuid;index" json:"route_stop_id"`
	RouteStop     *RouteStop `gorm:"foreignKey:RouteStopID" json:"route_stop,omitempty"`
	FromDriverID  *uuid.UUID `gorm:"type:uuid" json:"from_driver_id"`
	FromDriver    *Driver    `gorm:"foreignKey:FromDriverID" json:"from_driver,omitempty"`
	ToDriverID    *uuid.UUID `gorm:"type:uuid" json:"to_driver_id"`
	ToDriver      *Driver    `gorm:"foreignKey:ToDriverID" json:"to_driver,omitempty"`
	FromVehicleID *uuid.UUID `gorm:"type:uuid" json:"from_vehicle_id"`
	FromVehicle   *Vehicle   `gorm:"foreignKey:FromVehicleID" json:"from_vehicle,omitempty"`
	ToVehicleID   *uuid.UUID `gorm:"type:uuid" json:"to_vehicle_id"`
	ToVehicle     *Vehicle   `gorm:"foreignKey:ToVehicleID" json:"to_vehicle,omitempty"`
	Reason        string     `gorm:"not null" json:"reason"` // vehicle_breakdown, driver_unavailable, customer_request, etc.
	Notes         string     `json:"notes"`
	ReassignedBy  uuid.UUID  `gorm:"type:uuid;not null" json:"reassigned_by"`
	Reassigner    *User      `gorm:"foreignKey:ReassignedBy" json:"reassigner,omitempty"`
	CreatedAt     time.Time  `gorm:"index" json:"created_at"`
}
