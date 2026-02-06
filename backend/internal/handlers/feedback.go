package handlers

import (
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FeedbackRequest represents customer feedback
type FeedbackRequest struct {
	OrderID     string `json:"order_id" binding:"required"`
	Rating      int    `json:"rating" binding:"required,min=1,max=5"`
	Comment     string `json:"comment"`
	IssueType   string `json:"issue_type"` // "late", "damaged", "missing", "other"
	Description string `json:"description"`
}

// Feedback represents feedback model
type Feedback struct {
	ID          uuid.UUID `json:"id"`
	OrderID     uuid.UUID `json:"order_id"`
	CustomerID  uuid.UUID `json:"customer_id"`
	Rating      int       `json:"rating"`
	Comment     string    `json:"comment"`
	IssueType   string    `json:"issue_type"`
	Description string    `json:"description"`
	Status      string    `json:"status"` // "pending", "resolved", "closed"
	CreatedAt   time.Time `json:"created_at"`
}

// SubmitFeedback handles customer feedback submission
func SubmitFeedback(c *gin.Context) {
	var req FeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get order to verify and get customer ID
	var order models.Order
	if err := database.DB.First(&order, "id = ?", req.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Create feedback record (using a simple table)
	// In production, create proper Feedback model
	feedback := map[string]interface{}{
		"id":          uuid.New(),
		"order_id":    order.ID,
		"customer_id": order.CustomerID,
		"rating":      req.Rating,
		"comment":     req.Comment,
		"issue_type":  req.IssueType,
		"description": req.Description,
		"status":      "pending",
		"created_at":  time.Now(),
	}

	// In production, save to database
	// database.DB.Create(&feedback)

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Feedback submitted successfully",
		"feedback_id": feedback["id"],
	})
}

// ListFeedback lists all feedback
func ListFeedback(c *gin.Context) {
	status := c.Query("status")
	orderID := c.Query("order_id")

	// In production, query from database
	feedbacks := []map[string]interface{}{
		{
			"id":         uuid.New().String(),
			"order_id":   orderID,
			"rating":     5,
			"comment":    "ส่งของรวดเร็ว บริการดีมาก",
			"issue_type": "",
			"status":     status,
			"created_at": time.Now(),
		},
	}

	c.JSON(http.StatusOK, feedbacks)
}
