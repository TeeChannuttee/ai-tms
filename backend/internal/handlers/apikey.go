package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/middleware"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type APIKeyHandler struct{}

func NewAPIKeyHandler() *APIKeyHandler {
	return &APIKeyHandler{}
}

type CreateAPIKeyRequest struct {
	Name        string     `json:"name" binding:"required"`
	Permissions []string   `json:"permissions"`
	RateLimit   int        `json:"rate_limit"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

// CreateAPIKey creates a new API key
// @Summary Create API key
// @Tags API Keys
// @Security BearerAuth
// @Param request body CreateAPIKeyRequest true "API Key Request"
// @Success 201 {object} map[string]interface{}
// @Router /api/v1/api-keys [post]
func (h *APIKeyHandler) CreateAPIKey(c *gin.Context) {
	var req CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := c.Get("user")
	userModel := user.(*models.User)

	// Generate random API key
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate API key"})
		return
	}
	apiKey := "sk_" + hex.EncodeToString(keyBytes)

	// Hash the key for storage
	hash := sha256.Sum256([]byte(apiKey))
	keyHash := hex.EncodeToString(hash[:])

	// Convert permissions to JSON
	permissionsJSON := "[]"
	if len(req.Permissions) > 0 {
		permissionsJSON = `["` + req.Permissions[0] + `"]`
	}

	// Create API key record
	apiKeyModel := models.APIKey{
		Name:        req.Name,
		KeyHash:     keyHash,
		KeyPreview:  apiKey[:12] + "...",
		UserID:      userModel.ID,
		Permissions: permissionsJSON,
		RateLimit:   req.RateLimit,
		IsActive:    true,
		ExpiresAt:   req.ExpiresAt,
		CreatedAt:   time.Now(),
	}

	if err := database.DB.Create(&apiKeyModel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      apiKeyModel.ID,
		"name":    apiKeyModel.Name,
		"api_key": apiKey, // Only returned once!
		"preview": apiKeyModel.KeyPreview,
		"message": "Save this API key securely. It will not be shown again.",
	})
}

// ListAPIKeys lists all API keys for the current user
// @Summary List API keys
// @Tags API Keys
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/api-keys [get]
func (h *APIKeyHandler) ListAPIKeys(c *gin.Context) {
	user, _ := c.Get("user")
	userModel := user.(*models.User)

	var apiKeys []models.APIKey
	if err := database.DB.Where("user_id = ?", userModel.ID).Find(&apiKeys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch API keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": apiKeys,
	})
}

// RevokeAPIKey revokes an API key
// @Summary Revoke API key
// @Tags API Keys
// @Security BearerAuth
// @Param id path string true "API Key ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/api-keys/{id} [delete]
func (h *APIKeyHandler) RevokeAPIKey(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	user, _ := c.Get("user")
	userModel := user.(*models.User)

	var apiKey models.APIKey
	if err := database.DB.Where("id = ? AND user_id = ?", id, userModel.ID).First(&apiKey).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	apiKey.IsActive = false
	if err := database.DB.Save(&apiKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "API key revoked successfully",
	})
}

// RegisterRoutes registers API key routes
func (h *APIKeyHandler) RegisterRoutes(r *gin.RouterGroup) {
	apiKeys := r.Group("/api-keys")
	{
		apiKeys.POST("", middleware.RequirePermission(middleware.PermissionAPIKeyCreate), h.CreateAPIKey)
		apiKeys.GET("", middleware.RequirePermission(middleware.PermissionAPIKeyRead), h.ListAPIKeys)
		apiKeys.DELETE("/:id", middleware.RequirePermission(middleware.PermissionAPIKeyRevoke), h.RevokeAPIKey)
	}
}
