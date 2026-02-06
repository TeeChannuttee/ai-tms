package handlers

import (
	"net/http"

	"github.com/ai-tms/backend/internal/maps"
	"github.com/gin-gonic/gin"
)

// MapsProxyHandler handles maps proxy endpoints
type MapsProxyHandler struct {
	service *maps.MapsProxyService
}

// NewMapsProxyHandler creates a new maps proxy handler
func NewMapsProxyHandler(service *maps.MapsProxyService) *MapsProxyHandler {
	return &MapsProxyHandler{
		service: service,
	}
}

// RegisterRoutes registers maps proxy routes
func (h *MapsProxyHandler) RegisterRoutes(router *gin.RouterGroup) {
	mapsGroup := router.Group("/maps")
	{
		mapsGroup.POST("/geocode", h.Geocode)
		mapsGroup.POST("/reverse-geocode", h.ReverseGeocode)
		mapsGroup.POST("/route", h.GetRoute)
	}
}

// Geocode handles geocoding requests
func (h *MapsProxyHandler) Geocode(c *gin.Context) {
	var req maps.GeocodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Geocode(req.Address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ReverseGeocode handles reverse geocoding requests
func (h *MapsProxyHandler) ReverseGeocode(c *gin.Context) {
	var req maps.ReverseGeocodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.ReverseGeocode(req.Lat, req.Lng)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetRoute handles routing requests
func (h *MapsProxyHandler) GetRoute(c *gin.Context) {
	var req maps.RouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.GetRoute(req.Coordinates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
