package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a system user with role-based access
type User struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"not null" json:"-"` // Never expose password in JSON
	Name      string         `gorm:"not null" json:"name"`
	Phone     string         `json:"phone"`
	Role      string         `gorm:"type:user_role;not null" json:"role"` // admin, planner, dispatcher, driver, customer
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Depot represents a warehouse or distribution center
type Depot struct {
	ID                    uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Name                  string    `gorm:"not null" json:"name"`
	Code                  string    `gorm:"uniqueIndex;not null" json:"code"`
	Address               string    `json:"address"`
	Latitude              float64   `gorm:"not null" json:"latitude"`
	Longitude             float64   `gorm:"not null" json:"longitude"`
	Location              string    `gorm:"type:geography(POINT,4326)" json:"-"` // PostGIS point
	OperatingHoursStart   string    `json:"operating_hours_start"`
	OperatingHoursEnd     string    `json:"operating_hours_end"`
	AvgLoadingTimeMinutes int       `json:"avg_loading_time_minutes"`
	CapacityPallets       int       `json:"capacity_pallets"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// Vehicle represents a delivery vehicle
type Vehicle struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	LicensePlate    string         `gorm:"uniqueIndex;not null" json:"license_plate"`
	VehicleType     string         `gorm:"not null" json:"vehicle_type"` // Van, Truck 4-Wheel, etc.
	Type            string         `gorm:"-" json:"-"`                   // Alias for VehicleType (computed)
	CapacityKg      int            `gorm:"not null" json:"capacity_kg"`
	Capacity        int            `gorm:"-" json:"-"` // Alias for CapacityKg (computed)
	CapacityM3      float64        `json:"capacity_m3"`
	CostPerKm       float64        `gorm:"not null" json:"cost_per_km"`
	FuelType        string         `json:"fuel_type"`
	Year            int            `json:"year"`
	Status          string         `gorm:"type:vehicle_status;default:'active'" json:"status"`
	CurrentDriverID *uuid.UUID     `gorm:"type:uuid" json:"current_driver_id"`
	CurrentDriver   *Driver        `gorm:"foreignKey:CurrentDriverID" json:"current_driver,omitempty"`
	DepotID         uuid.UUID      `gorm:"type:uuid" json:"depot_id"`
	Depot           *Depot         `gorm:"foreignKey:DepotID" json:"depot,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Driver represents a delivery driver
type Driver struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	UserID          uuid.UUID      `gorm:"type:uuid;uniqueIndex" json:"user_id"`
	User            *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	LicenseNumber   string         `gorm:"uniqueIndex;not null" json:"license_number"`
	ExperienceYears float64        `json:"experience_years"`
	Rating          float64        `gorm:"default:5.0" json:"rating"`
	ShiftStart      string         `json:"shift_start"`
	ShiftEnd        string         `json:"shift_end"`
	Status          string         `gorm:"type:driver_status;default:'active'" json:"status"`
	DepotID         uuid.UUID      `gorm:"type:uuid" json:"depot_id"`
	Depot           *Depot         `gorm:"foreignKey:DepotID" json:"depot,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Customer represents a delivery destination (store, business, etc.)
type Customer struct {
	ID                    uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Code                  string         `gorm:"uniqueIndex;not null" json:"code"`
	Name                  string         `gorm:"not null" json:"name"`
	BusinessType          string         `json:"business_type"`
	Address               string         `gorm:"not null" json:"address"`
	Latitude              float64        `gorm:"not null" json:"latitude"`
	Longitude             float64        `gorm:"not null" json:"longitude"`
	Location              string         `gorm:"type:geography(POINT,4326)" json:"-"` // PostGIS point
	TimeWindowStart       string         `json:"time_window_start"`
	TimeWindowEnd         string         `json:"time_window_end"`
	AvgServiceTimeMinutes int            `json:"avg_service_time_minutes"`
	AccessDifficulty      string         `json:"access_difficulty"`    // easy, medium, hard
	ParkingAvailability   string         `json:"parking_availability"` // good, limited, difficult
	ContactName           string         `json:"contact_name"`
	ContactPhone          string         `json:"contact_phone"`
	ContactEmail          string         `json:"contact_email"`
	Notes                 string         `json:"notes"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	DeletedAt             gorm.DeletedAt `gorm:"index" json:"-"`
}

// Order represents a delivery order
type Order struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	OrderNumber     string         `gorm:"uniqueIndex;not null" json:"order_number"`
	CustomerID      uuid.UUID      `gorm:"type:uuid;not null" json:"customer_id"`
	Customer        *Customer      `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	PickupAddress   string         `json:"pickup_address"`
	DeliveryAddress string         `json:"delivery_address"`
	PickupTime      *time.Time     `json:"pickup_time"`
	DeliveryTime    *time.Time     `json:"delivery_time"`
	Status          string         `gorm:"type:order_status;default:'pending'" json:"status"`
	Priority        string         `gorm:"type:priority_level;default:'normal'" json:"priority"`
	WeightKg        float64        `json:"weight_kg"`
	VolumeM3        float64        `json:"volume_m3"`
	Items           int            `json:"items"`
	Notes           string         `json:"notes"`
	RequiredBy      *time.Time     `json:"required_by"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Route represents a planned delivery route
type Route struct {
	ID               uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	RouteNumber      string         `gorm:"uniqueIndex;not null" json:"route_number"`
	Date             time.Time      `gorm:"not null" json:"date"`
	PlannedDate      time.Time      `gorm:"-" json:"-"` // Alias for Date (computed)
	VehicleID        uuid.UUID      `gorm:"type:uuid" json:"vehicle_id"`
	Vehicle          *Vehicle       `gorm:"foreignKey:VehicleID" json:"vehicle,omitempty"`
	DriverID         *uuid.UUID     `gorm:"type:uuid" json:"driver_id"`
	Driver           *Driver        `gorm:"foreignKey:DriverID" json:"driver,omitempty"`
	DepotID          uuid.UUID      `gorm:"type:uuid;not null" json:"depot_id"`
	Depot            *Depot         `gorm:"foreignKey:DepotID" json:"depot,omitempty"`
	PlannedStartTime time.Time      `json:"planned_start_time"`
	PlannedEndTime   time.Time      `json:"planned_end_time"`
	ActualStartTime  *time.Time     `json:"actual_start_time"`
	ActualEndTime    *time.Time     `json:"actual_end_time"`
	TotalDistanceKm  float64        `json:"total_distance_km"`
	TotalDistance    float64        `gorm:"-" json:"-"` // Alias for TotalDistanceKm (computed)
	TotalDurationMin int            `json:"total_duration_min"`
	TotalStops       int            `json:"total_stops"`
	EstimatedCost    float64        `json:"estimated_cost"`
	TotalCost        float64        `gorm:"-" json:"-"`                      // Alias for EstimatedCost (computed)
	Status           string         `gorm:"default:'planned'" json:"status"` // planned, assigned, in_progress, completed
	IsLocked         bool           `gorm:"default:false" json:"is_locked"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// RouteStop represents a stop in a route
type RouteStop struct {
	ID                  uuid.UUID      `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	RouteID             uuid.UUID      `gorm:"type:uuid;not null" json:"route_id"`
	Route               *Route         `gorm:"foreignKey:RouteID" json:"route,omitempty"`
	OrderID             uuid.UUID      `gorm:"type:uuid;not null" json:"order_id"`
	Order               *Order         `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	Sequence            int            `gorm:"not null" json:"sequence"`
	PlannedArrival      time.Time      `json:"planned_arrival"`
	PlannedDeparture    time.Time      `json:"planned_departure"`
	ActualArrival       *time.Time     `json:"actual_arrival"`
	ActualDeparture     *time.Time     `json:"actual_departure"`
	DistanceFromPrevKm  float64        `json:"distance_from_prev_km"`
	DurationFromPrevMin int            `json:"duration_from_prev_min"`
	Status              string         `gorm:"type:delivery_status;default:'pending'" json:"status"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

// GPSTracking represents real-time vehicle location
type GPSTracking struct {
	ID             uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	VehicleID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"vehicle_id"`
	Vehicle        *Vehicle   `gorm:"foreignKey:VehicleID" json:"vehicle,omitempty"`
	RouteID        *uuid.UUID `gorm:"type:uuid;index" json:"route_id"`
	Route          *Route     `gorm:"foreignKey:RouteID" json:"route,omitempty"`
	Latitude       float64    `gorm:"not null" json:"latitude"`
	Longitude      float64    `gorm:"not null" json:"longitude"`
	Location       string     `gorm:"type:geography(POINT,4326);index:,type:gist" json:"-"` // PostGIS point
	SpeedKmh       float64    `json:"speed_kmh"`
	Speed          float64    `gorm:"-" json:"-"` // Alias for SpeedKmh (computed)
	Heading        int        `json:"heading"`    // 0-360 degrees
	AccuracyMeters float64    `json:"accuracy_meters"`
	Timestamp      time.Time  `gorm:"not null;index" json:"timestamp"`
	CreatedAt      time.Time  `json:"created_at"`
}

// ProofOfDelivery represents delivery confirmation
type ProofOfDelivery struct {
	ID                  uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	RouteStopID         uuid.UUID  `gorm:"type:uuid;uniqueIndex;not null" json:"route_stop_id"`
	RouteStop           *RouteStop `gorm:"foreignKey:RouteStopID" json:"route_stop,omitempty"`
	OrderID             uuid.UUID  `gorm:"-" json:"-"` // Computed from RouteStop
	PhotoURLs           string     `gorm:"type:jsonb;default:'[]'" json:"photo_urls"`
	PhotoURL            string     `gorm:"-" json:"-"` // First photo URL (computed)
	SignatureURL        string     `json:"signature_url"`
	RecipientName       string     `json:"recipient_name"`
	RecipientRelation   string     `json:"recipient_relation"` // customer, security, neighbor, etc.
	Notes               string     `json:"notes"`
	Latitude            float64    `json:"latitude"`
	Longitude           float64    `json:"longitude"`
	Location            string     `gorm:"-" json:"-"` // Computed lat,lng string
	AccuracyMeters      float64    `json:"accuracy_meters"`
	Timestamp           time.Time  `gorm:"not null" json:"timestamp"`
	DeliveredAt         time.Time  `gorm:"-" json:"-"` // Alias for Timestamp (computed)
	IsFlaggedSuspicious bool       `gorm:"default:false" json:"is_flagged_suspicious"`
	FraudScore          float64    `json:"fraud_score"` // 0-1, from AI model
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// Alert represents system alerts and notifications
type Alert struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Type       string     `gorm:"not null;index" json:"type"` // route_deviation, long_stop, speed_violation, etc.
	Severity   string     `gorm:"not null" json:"severity"`   // low, medium, high, critical
	VehicleID  *uuid.UUID `gorm:"type:uuid;index" json:"vehicle_id"`
	Vehicle    *Vehicle   `gorm:"foreignKey:VehicleID" json:"vehicle,omitempty"`
	RouteID    *uuid.UUID `gorm:"type:uuid;index" json:"route_id"`
	Route      *Route     `gorm:"foreignKey:RouteID" json:"route,omitempty"`
	DriverID   *uuid.UUID `gorm:"type:uuid;index" json:"driver_id"`
	Driver     *Driver    `gorm:"foreignKey:DriverID" json:"driver,omitempty"`
	Title      string     `gorm:"not null" json:"title"`
	Message    string     `gorm:"not null" json:"message"`
	Data       string     `gorm:"type:jsonb" json:"data"` // Additional context as JSON
	IsRead     bool       `gorm:"default:false" json:"is_read"`
	IsResolved bool       `gorm:"default:false" json:"is_resolved"`
	ResolvedAt *time.Time `json:"resolved_at"`
	ResolvedBy *uuid.UUID `gorm:"type:uuid" json:"resolved_by"`
	CreatedAt  time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// SLARule represents service level agreement rules
type SLARule struct {
	ID                 uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Name               string    `gorm:"not null" json:"name"`
	Description        string    `json:"description"`
	OnTimeThresholdMin int       `json:"on_time_threshold_min"` // Minutes late allowed before considered late
	Priority           string    `gorm:"type:priority_level" json:"priority"`
	IsActive           bool      `gorm:"default:true" json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}
