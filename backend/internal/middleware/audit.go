package middleware

import (
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var auditService = services.NewAuditService()

// AuditMiddleware logs critical actions
func AuditMiddleware(action string, entityType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user
		user, exists := c.Get("user")
		if !exists {
			c.Next()
			return
		}

		userModel, ok := user.(*models.User)
		if !ok {
			c.Next()
			return
		}

		// Get IP and User-Agent
		ipAddress := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// Get entity ID from URL param if available
		entityIDStr := c.Param("id")
		var entityID uuid.UUID
		if entityIDStr != "" {
			parsedID, err := uuid.Parse(entityIDStr)
			if err == nil {
				entityID = parsedID
			}
		}

		// Process request
		c.Next()

		// Only log if request was successful (2xx status)
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			// Get changes from context if set by handler
			changes, _ := c.Get("audit_changes")

			// Log the action
			auditService.LogAction(
				userModel.ID,
				action,
				entityType,
				entityID,
				changes,
				ipAddress,
				userAgent,
			)
		}
	}
}
