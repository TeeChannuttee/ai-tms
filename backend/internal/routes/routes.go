package routes

import (
	"github.com/ai-tms/backend/internal/handlers"
	"github.com/ai-tms/backend/internal/middleware"
	services "github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// SetupAuthRoutes sets up authentication routes
func SetupAuthRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		auth.POST("/login", handlers.Login)
		auth.POST("/register", handlers.Register)
		auth.POST("/refresh", handlers.RefreshToken)
	}
}

// SetupUserRoutes sets up user management routes
func SetupUserRoutes(router *gin.RouterGroup) {
	users := router.Group("/users")
	users.Use(middleware.AuthMiddleware())
	{
		users.GET("/me", handlers.GetMe)
		users.GET("", middleware.RoleMiddleware("admin"), listUsersHandler)
		users.GET("/:id", getUserHandler)
		users.PUT("/:id", updateUserHandler)
		users.DELETE("/:id", middleware.RoleMiddleware("admin"), deleteUserHandler)
	}
}

// SetupFleetRoutes sets up fleet/vehicle management routes
func SetupFleetRoutes(router *gin.RouterGroup) {
	fleet := router.Group("/fleet")
	{
		// Public read access for vehicles and depots
		fleet.GET("/vehicles", handlers.ListVehicles)
		fleet.GET("/depots", handlers.ListDepots)

		// Protected fleet operations (admin and planner only)
		protected := fleet.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("/vehicles/:id/link", handlers.LinkVehicle)
			protected.POST("/vehicles/:id/unlink", handlers.UnlinkVehicle)

			// Admin/Planner only
			adminOnly := protected.Group("")
			adminOnly.Use(middleware.RoleMiddleware("admin", "planner"))
			{
				adminOnly.POST("/vehicles", handlers.CreateVehicle)
				adminOnly.PUT("/vehicles/:id", handlers.UpdateVehicle)
				adminOnly.DELETE("/vehicles/:id", handlers.DeleteVehicle)
				adminOnly.POST("/depots", handlers.CreateDepot)
			}
		}
	}
}

// SetupDriverRoutes sets up driver management routes
func SetupDriverRoutes(router *gin.RouterGroup) {
	drivers := router.Group("/drivers")
	{
		// Public read access for driver list
		drivers.GET("", handlers.ListDrivers)
		drivers.GET("/alerts", handlers.ListDriverAlerts)

		// Protected operations
		protected := drivers.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("", middleware.RoleMiddleware("admin"), createDriverHandler)
			protected.GET("/:id", getDriverHandler)
			protected.PUT("/:id", updateDriverHandler)
			protected.DELETE("/:id", middleware.RoleMiddleware("admin"), deleteDriverHandler)
			protected.PUT("/alerts/:id/read", handlers.MarkAlertRead)
		}
	}
}

// SetupCustomerRoutes sets up customer management routes
func SetupCustomerRoutes(router *gin.RouterGroup) {
	customers := router.Group("/customers")
	{
		// Publicly accessible for UI lookups
		customers.GET("", handlers.ListCustomers)
		customers.GET("/:id", handlers.GetCustomer)
		customers.POST("", handlers.CreateCustomer)
		customers.PUT("/:id", handlers.UpdateCustomer)
		customers.DELETE("/:id", handlers.DeleteCustomer)
	}
}

// SetupOrderRoutes sets up order management routes
func SetupOrderRoutes(router *gin.RouterGroup) {
	orders := router.Group("/orders")
	{
		// Publicly accessible for demo/tracking visibility
		orders.GET("", handlers.ListOrders)
		orders.GET("/track/:number", handlers.TrackOrder)

		// Protected operations
		protected := orders.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("", middleware.RoleMiddleware("admin", "planner"), handlers.CreateOrder)
			protected.POST("/import", middleware.RoleMiddleware("admin", "planner"), handlers.ImportOrders)
			protected.GET("/:id", handlers.GetOrder)
			protected.PUT("/:id", handlers.UpdateOrder)
			protected.DELETE("/:id", middleware.RoleMiddleware("admin", "planner"), handlers.DeleteOrder)
		}
	}
}

// SetupRouteRoutes sets up route planning routes
func SetupRouteRoutes(router *gin.RouterGroup) {
	routes := router.Group("/routes")
	{
		// Public read access for demo
		routes.GET("", handlers.ListRoutes)

		// Protected operations
		protected := routes.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("", middleware.RoleMiddleware("planner", "admin"), handlers.CreateRoute)
			protected.POST("/generate", middleware.RoleMiddleware("planner", "admin"), handlers.GenerateRoute)
			protected.GET("/:id", handlers.GetRoute)
			protected.PUT("/:id", middleware.RoleMiddleware("planner", "admin"), handlers.UpdateRoute)
			protected.DELETE("/:id", middleware.RoleMiddleware("planner", "admin"), handlers.DeleteRoute)
			protected.GET("/stats", handlers.GetDriverStats)
			protected.POST("/:id/start", middleware.RoleMiddleware("driver"), handlers.StartRoute)
			protected.POST("/:id/stops", middleware.RoleMiddleware("planner", "admin"), handlers.AddStopToRoute)
			protected.DELETE("/:id/stops/:stop_id", middleware.RoleMiddleware("planner", "admin"), handlers.RemoveStopFromRoute)
			protected.PUT("/stops/:id/status", middleware.RoleMiddleware("driver"), handlers.UpdateStopStatus)
			protected.POST("/:id/assign", middleware.RoleMiddleware("planner", "dispatcher", "admin"), handlers.AssignRoute)
			protected.POST("/:id/lock", middleware.RoleMiddleware("planner", "admin"), lockRouteHandler)
		}
	}
}

// SetupTrackingRoutes sets up GPS tracking routes
func SetupTrackingRoutes(router *gin.RouterGroup) {
	tracking := router.Group("/tracking")
	tracking.Use(middleware.AuthMiddleware())
	{
		tracking.GET("/fleet", handlers.GetAllVehicleLocations)
		tracking.GET("/vehicles/:id", handlers.GetVehicleLocation)
		tracking.POST("/gps", handlers.UpdateGPS)
		tracking.GET("/routes/:id", handlers.GetRouteTracking)
	}
}

// SetupRealtimeRoutes registers SSE endpoint
func SetupRealtimeRoutes(router *gin.RouterGroup) {
	router.GET("/events", gin.WrapF(services.GetEventService().SSEHandler))
}

// SetupPODRoutes sets up proof of delivery routes
func SetupPODRoutes(router *gin.RouterGroup) {
	pods := router.Group("/pods")
	pods.Use(middleware.AuthMiddleware())
	{
		pods.GET("", handlers.ListPODs)
		pods.POST("", middleware.RoleMiddleware("driver"), handlers.SubmitPOD)
		pods.POST("/:id/photo", middleware.RoleMiddleware("driver"), handlers.UploadPODPhoto)
		pods.POST("/:id/signature", middleware.RoleMiddleware("driver"), handlers.UploadPODSignature)
		pods.GET("/:id", handlers.GetPOD)
		pods.GET("/order/:order_id", handlers.GetPODByOrder)
	}
}

// SetupAnalyticsRoutes sets up analytics and reporting routes
func SetupAnalyticsRoutes(router *gin.RouterGroup) {
	analytics := router.Group("/analytics")
	{
		// Public dashboard data
		analytics.GET("/dashboard", handlers.GetDashboard)

		// Protected reporting
		protected := analytics.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/kpi", getKPIHandler)
			protected.GET("/reports/daily", handlers.GetDailyReport)
			protected.GET("/reports/weekly", handlers.GetWeeklyReport)
		}
	}
}

// SetupAuditRoutes sets up audit log routes
func SetupAuditRoutes(router *gin.RouterGroup) {
	auditHandler := handlers.NewAuditHandler()
	auditHandler.RegisterRoutes(router)
}

// SetupAPIKeyRoutes sets up API key management routes
func SetupAPIKeyRoutes(router *gin.RouterGroup) {
	apiKeyHandler := handlers.NewAPIKeyHandler()
	apiKeyHandler.RegisterRoutes(router)
}

// SetupPlanVersionRoutes sets up plan version routes
func SetupPlanVersionRoutes(router *gin.RouterGroup) {
	planVersionHandler := handlers.NewPlanVersionHandler()
	planVersionHandler.RegisterRoutes(router)
}

// SetupMapsProxyRoutes sets up maps proxy routes
func SetupMapsProxyRoutes(router *gin.RouterGroup, mapsProxyHandler *handlers.MapsProxyHandler) {
	mapsProxyHandler.RegisterRoutes(router)
}

// -----------------------------------------------------------------------------
// Placeholder / Missing Handlers
// -----------------------------------------------------------------------------

func listUsersHandler(c *gin.Context)  { c.JSON(501, gin.H{"error": "Not implemented"}) }
func getUserHandler(c *gin.Context)    { c.JSON(501, gin.H{"error": "Not implemented"}) }
func updateUserHandler(c *gin.Context) { c.JSON(501, gin.H{"error": "Not implemented"}) }
func deleteUserHandler(c *gin.Context) { c.JSON(501, gin.H{"error": "Not implemented"}) }

func createDriverHandler(c *gin.Context) { c.JSON(501, gin.H{"error": "Not implemented"}) }
func getDriverHandler(c *gin.Context)    { c.JSON(501, gin.H{"error": "Not implemented"}) }
func updateDriverHandler(c *gin.Context) { c.JSON(501, gin.H{"error": "Not implemented"}) }
func deleteDriverHandler(c *gin.Context) { c.JSON(501, gin.H{"error": "Not implemented"}) }

func lockRouteHandler(c *gin.Context) { c.JSON(501, gin.H{"error": "Not implemented"}) }
func getKPIHandler(c *gin.Context)    { c.JSON(501, gin.H{"error": "Not implemented"}) }
