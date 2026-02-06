package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/ai-tms/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SubmitPODRequest represents POD submission
type SubmitPODRequest struct {
	OrderID       string  `json:"order_id" binding:"required"`
	RecipientName string  `json:"recipient_name" binding:"required"`
	Latitude      float64 `json:"latitude" binding:"required"`
	Longitude     float64 `json:"longitude" binding:"required"`
	Notes         string  `json:"notes"`
}

func SubmitPOD(c *gin.Context) {
	var req SubmitPODRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Find the RouteStop associated with this Order
	var routeStop models.RouteStop
	if err := database.DB.Where("order_id = ?", req.OrderID).First(&routeStop).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Associated route stop not found"})
		return
	}

	// 2. Create POD record with all required fields
	pod := models.ProofOfDelivery{
		ID:            uuid.New(),
		RouteStopID:   routeStop.ID,
		RecipientName: req.RecipientName,
		Latitude:      req.Latitude,
		Longitude:     req.Longitude,
		Timestamp:     time.Now(),
		Notes:         req.Notes,
		PhotoURLs:     "[]", // Initialize as empty JSON array
	}

	if err := database.DB.Create(&pod).Error; err != nil {
		log.Printf("❌ Failed to save POD: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save POD"})
		return
	}

	// 3. Update order status
	if err := database.DB.Model(&models.Order{}).
		Where("id = ?", req.OrderID).
		Update("status", "delivered").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	// 4. Update the RouteStop status
	if err := database.DB.Model(&models.RouteStop{}).
		Where("id = ?", routeStop.ID).
		Update("status", "delivered").Error; err != nil {
		log.Printf("⚠️ Failed to update route stop status: %v", err)
	}

	// 5. Broadcast event for real-time dashboard
	log.Printf("📢 Broadcasting POD submission for order %s", req.OrderID)
	services.GetEventService().Broadcast(services.EventStatusUpdate, gin.H{
		"stop_id":  routeStop.ID.String(),
		"status":   "delivered",
		"route_id": routeStop.RouteID,
		"order_id": routeStop.OrderID,
	})

	log.Printf("✅ POD created successfully for order %s", req.OrderID)
	c.JSON(http.StatusCreated, gin.H{
		"pod_id":  pod.ID.String(),
		"message": "POD submitted successfully",
	})
}

// UploadPODPhoto handles photo upload for POD (appends to photo_urls array)
func UploadPODPhoto(c *gin.Context) {
	podID := c.Param("id")

	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No photo uploaded"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_%d%s", podID, time.Now().UnixNano(), ext)
	savePath := filepath.Join("uploads", "pod", filename)

	// Save file
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}

	// Use forward slashes for the DB path to work as a URL path
	dbPath := fmt.Sprintf("/uploads/pod/%s", filename)

	// Append to photo_urls JSONB array
	jsonPath := fmt.Sprintf("[\"%s\"]", dbPath)
	if err := database.DB.Model(&models.ProofOfDelivery{}).
		Where("id = ?", podID).
		Update("photo_urls", gorm.Expr("photo_urls || ?::jsonb", jsonPath)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update POD"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Photo uploaded successfully",
		"photo_url": dbPath,
	})
}

// UploadPODSignature handles signature upload for POD
func UploadPODSignature(c *gin.Context) {
	podID := c.Param("id")

	var req struct {
		SignatureData string `json:"signature_data" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update POD record with signature
	if err := database.DB.Model(&models.ProofOfDelivery{}).
		Where("id = ?", podID).
		Update("signature_url", req.SignatureData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save signature"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Signature saved successfully"})
}

// GetPOD retrieves POD details
func GetPOD(c *gin.Context) {
	podID := c.Param("id")

	var pod models.ProofOfDelivery
	if err := database.DB.Preload("RouteStop.Order").Preload("RouteStop.Order.Customer").First(&pod, "id = ?", podID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "POD not found"})
		return
	}

	var photos []string
	json.Unmarshal([]byte(pod.PhotoURLs), &photos)

	orderID := ""
	if pod.RouteStop != nil {
		orderID = pod.RouteStop.OrderID.String()
	}

	c.JSON(http.StatusOK, gin.H{
		"id":             pod.ID.String(),
		"order_id":       orderID,
		"recipient_name": pod.RecipientName,
		"location":       fmt.Sprintf("%.6f, %.6f", pod.Latitude, pod.Longitude),
		"photo_urls":     photos,
		"signature_url":  pod.SignatureURL,
		"delivered_at":   pod.Timestamp,
		"notes":          pod.Notes,
	})
}

// GetPODByOrder retrieves POD for a specific order
func GetPODByOrder(c *gin.Context) {
	orderID := c.Param("order_id")

	var pod models.ProofOfDelivery
	if err := database.DB.Preload("RouteStop.Order").Preload("RouteStop.Order.Customer").
		Joins("JOIN route_stops ON route_stops.id = proof_of_deliveries.route_stop_id").
		Where("route_stops.order_id = ?", orderID).First(&pod).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "POD not found"})
		return
	}

	var photos []string
	json.Unmarshal([]byte(pod.PhotoURLs), &photos)

	c.JSON(http.StatusOK, gin.H{
		"id":             pod.ID.String(),
		"order_id":       orderID,
		"recipient_name": pod.RecipientName,
		"location":       fmt.Sprintf("%.6f, %.6f", pod.Latitude, pod.Longitude),
		"photo_urls":     photos,
		"signature_url":  pod.SignatureURL,
		"delivered_at":   pod.Timestamp,
		"notes":          pod.Notes,
	})
}

// ListPODs lists all proof of delivery records
func ListPODs(c *gin.Context) {
	var pods []models.ProofOfDelivery
	if err := database.DB.Preload("RouteStop").Preload("RouteStop.Order").Preload("RouteStop.Order.Customer").Find(&pods).Error; err != nil {
		log.Printf("❌ Failed to fetch PODs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch PODs"})
		return
	}

	log.Printf("📦 Fetched %d POD records", len(pods))

	// Transform to a clean list
	type PODListItem struct {
		ID            string    `json:"id"`
		OrderID       string    `json:"order_id"`
		OrderNumber   string    `json:"order_number"`
		CustomerName  string    `json:"customer_name"`
		RecipientName string    `json:"recipient_name"`
		Timestamp     time.Time `json:"timestamp"`
		IsSuspicious  bool      `json:"is_suspicious"`
		PhotoURL      string    `json:"photo_url"`
		PhotoCount    int       `json:"photo_count"`
	}

	result := make([]PODListItem, 0, len(pods))
	for _, p := range pods {
		orderID := ""
		orderNum := "N/A"
		custName := "Unknown"

		if p.RouteStop != nil && p.RouteStop.Order != nil {
			orderID = p.RouteStop.OrderID.String()
			orderNum = p.RouteStop.Order.OrderNumber
			if p.RouteStop.Order.Customer != nil {
				custName = p.RouteStop.Order.Customer.Name
			}
		}

		var photos []string
		json.Unmarshal([]byte(p.PhotoURLs), &photos)

		photoURL := p.SignatureURL
		if len(photos) > 0 {
			photoURL = photos[0]
		}

		result = append(result, PODListItem{
			ID:            p.ID.String(),
			OrderID:       orderID,
			OrderNumber:   orderNum,
			CustomerName:  custName,
			RecipientName: p.RecipientName,
			Timestamp:     p.Timestamp,
			IsSuspicious:  p.IsFlaggedSuspicious,
			PhotoURL:      photoURL,
			PhotoCount:    len(photos),
		})
	}

	c.JSON(http.StatusOK, result)
}
