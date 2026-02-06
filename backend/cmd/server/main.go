package main

import (
	"log"
	"os"
	"strconv"

	"github.com/ai-tms/backend/internal/cache"
	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/handlers"
	"github.com/ai-tms/backend/internal/maps"
	"github.com/ai-tms/backend/internal/middleware"
	"github.com/ai-tms/backend/internal/routes"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
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

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.Migrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Connect to Redis
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisDBStr := os.Getenv("REDIS_DB")
	redisDB := 1
	if redisDBStr != "" {
		if db, err := strconv.Atoi(redisDBStr); err == nil {
			redisDB = db
		}
	}

	log.Printf("📝 Redis config:")
	log.Printf("   REDIS_HOST=%s", redisHost)
	log.Printf("   REDIS_PORT=%s", redisPort)
	log.Printf("   REDIS_DB=%d", redisDB)

	if err := cache.ConnectRedis(redisHost, redisPort, redisPassword, redisDB); err != nil {
		log.Printf("⚠️  Failed to connect to Redis: %v", err)
		log.Println("   Maps caching will be disabled")
	} else {
		log.Println("✅ Connected to Redis")
	}

	// Initialize Maps Proxy Service
	nominatimURL := os.Getenv("NOMINATIM_URL")
	if nominatimURL == "" {
		nominatimURL = "https://nominatim.openstreetmap.org"
	}
	osrmURL := os.Getenv("OSRM_URL")
	if osrmURL == "" {
		osrmURL = "https://router.project-osrm.org"
	}

	mapsProxyService := maps.NewMapsProxyService(nominatimURL, osrmURL, 1.0, 5.0)
	mapsProxyHandler := handlers.NewMapsProxyHandler(mapsProxyService)
	log.Println("✅ Maps Proxy Service initialized")

	// Initialize Notification Service (LINE Notify)
	lineToken := os.Getenv("LINE_NOTIFY_TOKEN")
	notificationService := services.NewNotificationService(lineToken)
	if lineToken != "" {
		log.Println("✅ Notification Service (LINE Notify) initialized")
	} else {
		log.Println("⚠️  LINE_NOTIFY_TOKEN not found, notifications will be disabled")
	}

	// Initialize Audit Service
	auditService := services.NewAuditService()
	log.Println("✅ Audit Service initialized")

	// Inject services into handlers
	handlers.InitializeServices(notificationService, auditService)

	// Setup Gin router
	if os.Getenv("BACKEND_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Global middleware
	router.Use(middleware.CORSMiddleware())
	router.Use(gin.Recovery())
	router.Use(middleware.IdempotencyMiddleware())

	// Static files sharing
	_ = os.MkdirAll("./uploads/pod", 0755)
	_ = os.MkdirAll("./uploads/signature", 0755)
	router.Static("/uploads", "./uploads")

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "ai-tms-backend",
			"version": "1.0.0",
		})
	})

	// API routes
	public := router.Group("/api/v1")
	{
		routes.SetupAuthRoutes(public)
		routes.SetupOrderRoutes(public)
		routes.SetupCustomerRoutes(public)
		routes.SetupAnalyticsRoutes(public)
	}

	// Protected API routes (Auth required)
	protected := router.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware())
	{
		routes.SetupUserRoutes(protected)
		routes.SetupFleetRoutes(protected)
		routes.SetupDriverRoutes(protected)
		// Removed redundant SetupCustomerRoutes and SetupOrderRoutes from here
		routes.SetupRouteRoutes(protected)
		routes.SetupTrackingRoutes(protected)
		routes.SetupPODRoutes(protected)
		// Analytics routes are already set up in public section above
		// Security & Governance routes
		routes.SetupAuditRoutes(protected)
		routes.SetupAPIKeyRoutes(protected)
		routes.SetupPlanVersionRoutes(protected)
		// Maps Proxy routes
		routes.SetupMapsProxyRoutes(protected, mapsProxyHandler)
		// Model Monitoring routes
		routes.SetupModelMonitoringRoutes(protected)
		// Real-time Event routes (SSE)
		routes.SetupRealtimeRoutes(protected)
	}

	// Start server
	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 AI-TMS Backend Server starting on port %s...\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
