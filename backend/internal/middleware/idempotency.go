package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// IdempotencyMiddleware prevents duplicate requests
func IdempotencyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only apply to POST, PUT, PATCH, DELETE
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Get idempotency key from header
		idempotencyKey := c.GetHeader("Idempotency-Key")
		if idempotencyKey == "" {
			// No idempotency key provided, proceed normally
			c.Next()
			return
		}

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

		// Read request body for hashing
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
			c.Abort()
			return
		}

		// Restore body for next handlers
		c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

		// Calculate request hash
		hash := sha256.Sum256(bodyBytes)
		requestHash := hex.EncodeToString(hash[:])

		// Check if this request was already processed
		var existingKey models.IdempotencyKey
		result := database.DB.Where("key = ? AND user_id = ?", idempotencyKey, userModel.ID).First(&existingKey)

		if result.Error == nil {
			// Found existing request
			if existingKey.RequestHash == requestHash {
				// Same request, return cached response
				var responseBody map[string]interface{}
				if err := json.Unmarshal([]byte(existingKey.ResponseBody), &responseBody); err == nil {
					c.JSON(existingKey.ResponseStatus, responseBody)
					c.Abort()
					return
				}
			} else {
				// Different request with same key
				c.JSON(http.StatusConflict, gin.H{
					"error": "Idempotency key already used with different request",
				})
				c.Abort()
				return
			}
		}

		// Create response writer wrapper to capture response
		blw := &bodyLogWriter{body: []byte{}, ResponseWriter: c.Writer}
		c.Writer = blw

		// Process request
		c.Next()

		// Store idempotency key with response
		idempotencyRecord := models.IdempotencyKey{
			Key:            idempotencyKey,
			UserID:         userModel.ID,
			Endpoint:       c.Request.URL.Path,
			RequestHash:    requestHash,
			ResponseStatus: c.Writer.Status(),
			ResponseBody:   string(blw.body),
			CreatedAt:      time.Now(),
			ExpiresAt:      time.Now().Add(24 * time.Hour), // Expire after 24 hours
		}

		database.DB.Create(&idempotencyRecord)
	}
}

// bodyLogWriter wraps gin.ResponseWriter to capture response body
type bodyLogWriter struct {
	gin.ResponseWriter
	body []byte
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	w.body = append(w.body, b...)
	return w.ResponseWriter.Write(b)
}
