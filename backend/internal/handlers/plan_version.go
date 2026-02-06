package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/middleware"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PlanVersionHandler struct{}

func NewPlanVersionHandler() *PlanVersionHandler {
	return &PlanVersionHandler{}
}

type CreatePlanVersionRequest struct {
	PlanID   uuid.UUID              `json:"plan_id" binding:"required"`
	Reason   string                 `json:"reason"`
	Snapshot map[string]interface{} `json:"snapshot" binding:"required"`
	KPIs     map[string]interface{} `json:"kpis"`
}

// CreatePlanVersion creates a new plan version
// @Summary Create plan version
// @Tags Plan Versions
// @Security BearerAuth
// @Param request body CreatePlanVersionRequest true "Plan Version Request"
// @Success 201 {object} map[string]interface{}
// @Router /api/v1/plan-versions [post]
func (h *PlanVersionHandler) CreatePlanVersion(c *gin.Context) {
	var req CreatePlanVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := c.Get("user")
	userModel := user.(*models.User)

	// Get next version number
	var maxVersion int
	database.DB.Model(&models.PlanVersion{}).
		Where("plan_id = ?", req.PlanID).
		Select("COALESCE(MAX(version), 0)").
		Scan(&maxVersion)

	nextVersion := maxVersion + 1

	// Convert snapshot and KPIs to JSON
	snapshotJSON, _ := json.Marshal(req.Snapshot)
	kpisJSON, _ := json.Marshal(req.KPIs)

	planVersion := models.PlanVersion{
		PlanID:    req.PlanID,
		Version:   nextVersion,
		Status:    "draft",
		CreatedBy: userModel.ID,
		Reason:    req.Reason,
		Snapshot:  string(snapshotJSON),
		KPIs:      string(kpisJSON),
		CreatedAt: time.Now(),
	}

	if err := database.DB.Create(&planVersion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan version"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": planVersion,
	})
}

// GetPlanVersions lists all versions for a plan
// @Summary Get plan versions
// @Tags Plan Versions
// @Security BearerAuth
// @Param plan_id path string true "Plan ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/plans/{plan_id}/versions [get]
func (h *PlanVersionHandler) GetPlanVersions(c *gin.Context) {
	planIDStr := c.Param("plan_id")
	planID, err := uuid.Parse(planIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan_id"})
		return
	}

	var versions []models.PlanVersion
	if err := database.DB.Where("plan_id = ?", planID).
		Order("version DESC").
		Preload("Creator").
		Preload("Publisher").
		Find(&versions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch versions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": versions,
	})
}

// PublishPlanVersion publishes a plan version
// @Summary Publish plan version
// @Tags Plan Versions
// @Security BearerAuth
// @Param id path string true "Version ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/plan-versions/{id}/publish [post]
func (h *PlanVersionHandler) PublishPlanVersion(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	user, _ := c.Get("user")
	userModel := user.(*models.User)

	var version models.PlanVersion
	if err := database.DB.First(&version, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Version not found"})
		return
	}

	if version.Status == "published" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Version already published"})
		return
	}

	now := time.Now()
	version.Status = "published"
	version.PublishedBy = &userModel.ID
	version.PublishedAt = &now

	if err := database.DB.Save(&version).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish version"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    version,
		"message": "Plan version published successfully",
	})
}

// ComparePlanVersions compares two plan versions
// @Summary Compare plan versions
// @Tags Plan Versions
// @Security BearerAuth
// @Param plan_id path string true "Plan ID"
// @Param v1 query int true "Version 1"
// @Param v2 query int true "Version 2"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/plans/{plan_id}/versions/compare [get]
func (h *PlanVersionHandler) ComparePlanVersions(c *gin.Context) {
	planIDStr := c.Param("plan_id")
	planID, err := uuid.Parse(planIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan_id"})
		return
	}

	v1 := c.Query("v1")
	v2 := c.Query("v2")

	var version1, version2 models.PlanVersion
	if err := database.DB.Where("plan_id = ? AND version = ?", planID, v1).First(&version1).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Version 1 not found"})
		return
	}
	if err := database.DB.Where("plan_id = ? AND version = ?", planID, v2).First(&version2).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Version 2 not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"version1": version1,
		"version2": version2,
		"message":  "Compare versions in frontend",
	})
}

// RegisterRoutes registers plan version routes
func (h *PlanVersionHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/plan-versions", middleware.RequirePermission(middleware.PermissionRouteCreate), h.CreatePlanVersion)
	r.GET("/plans/:plan_id/versions", middleware.RequirePermission(middleware.PermissionRouteRead), h.GetPlanVersions)
	r.POST("/plan-versions/:id/publish", middleware.RequirePermission(middleware.PermissionRoutePublish), h.PublishPlanVersion)
	r.GET("/plans/:plan_id/versions/compare", middleware.RequirePermission(middleware.PermissionRouteRead), h.ComparePlanVersions)
}
