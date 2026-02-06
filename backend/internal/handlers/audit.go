package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/ai-tms/backend/internal/middleware"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuditHandler struct {
	auditService *services.AuditService
}

func NewAuditHandler() *AuditHandler {
	return &AuditHandler{
		auditService: services.NewAuditService(),
	}
}

// GetAuditLogs retrieves audit logs with filters
// @Summary Get audit logs
// @Tags Audit
// @Security BearerAuth
// @Param user_id query string false "User ID"
// @Param action query string false "Action"
// @Param entity_type query string false "Entity Type"
// @Param from query string false "From date (RFC3339)"
// @Param to query string false "To date (RFC3339)"
// @Param limit query int false "Limit" default(50)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/audit-logs [get]
func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	// Parse query parameters
	var userID *uuid.UUID
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		parsed, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
			return
		}
		userID = &parsed
	}

	var action *string
	if actionStr := c.Query("action"); actionStr != "" {
		action = &actionStr
	}

	var entityType *string
	if entityTypeStr := c.Query("entity_type"); entityTypeStr != "" {
		entityType = &entityTypeStr
	}

	var from *time.Time
	if fromStr := c.Query("from"); fromStr != "" {
		parsed, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format"})
			return
		}
		from = &parsed
	}

	var to *time.Time
	if toStr := c.Query("to"); toStr != "" {
		parsed, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format"})
			return
		}
		to = &parsed
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	logs, total, err := h.auditService.GetAuditLogs(userID, action, entityType, from, to, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   logs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetEntityHistory retrieves all changes for a specific entity
// @Summary Get entity history
// @Tags Audit
// @Security BearerAuth
// @Param entity_type path string true "Entity Type"
// @Param entity_id path string true "Entity ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/audit-logs/{entity_type}/{entity_id} [get]
func (h *AuditHandler) GetEntityHistory(c *gin.Context) {
	entityType := c.Param("entity_type")
	entityIDStr := c.Param("entity_id")

	entityID, err := uuid.Parse(entityIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity_id"})
		return
	}

	logs, err := h.auditService.GetEntityHistory(entityType, entityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
	})
}

// RegisterRoutes registers audit routes
func (h *AuditHandler) RegisterRoutes(r *gin.RouterGroup) {
	audit := r.Group("/audit-logs")
	audit.Use(middleware.RequirePermission(middleware.PermissionAuditView))
	{
		audit.GET("", h.GetAuditLogs)
		audit.GET("/:entity_type/:entity_id", h.GetEntityHistory)
	}
}
