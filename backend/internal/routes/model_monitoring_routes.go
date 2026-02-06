package routes

import (
	"github.com/ai-tms/backend/internal/handlers"
	"github.com/gin-gonic/gin"
)

// SetupModelMonitoringRoutes registers model monitoring routes
func SetupModelMonitoringRoutes(router *gin.RouterGroup) {
	handler := handlers.NewModelMonitoringHandler()
	handler.RegisterRoutes(router)
}
