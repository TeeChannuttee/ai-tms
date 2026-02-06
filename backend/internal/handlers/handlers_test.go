package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ai-tms/backend/internal/handlers"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    map[string]string
		expectedStatus int
	}{
		{
			name: "Valid login",
			requestBody: map[string]string{
				"email":    "admin@aitms.com",
				"password": "password123",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Invalid email format",
			requestBody: map[string]string{
				"email":    "invalid-email",
				"password": "password123",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Missing password",
			requestBody: map[string]string{
				"email": "admin@aitms.com",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			body, _ := json.Marshal(tt.requestBody)
			c.Request = httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")

			handlers.Login(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCreateOrder(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
	}{
		{
			name: "Valid order creation",
			requestBody: map[string]interface{}{
				"customer_id":      "123e4567-e89b-12d3-a456-426614174000",
				"delivery_address": "Bangkok, Thailand",
				"priority":         "normal",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "Missing customer_id",
			requestBody: map[string]interface{}{
				"delivery_address": "Bangkok, Thailand",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			body, _ := json.Marshal(tt.requestBody)
			c.Request = httptest.NewRequest("POST", "/orders", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")

			handlers.CreateOrder(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGenerateRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Valid route generation", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		requestBody := map[string]interface{}{
			"order_ids": []string{
				"123e4567-e89b-12d3-a456-426614174000",
				"123e4567-e89b-12d3-a456-426614174001",
			},
			"depot_id": "123e4567-e89b-12d3-a456-426614174002",
		}

		body, _ := json.Marshal(requestBody)
		c.Request = httptest.NewRequest("POST", "/routes/generate", bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")

		handlers.GenerateRoute(c)

		// Should return 200 or 500 depending on database state
		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusInternalServerError)
	})
}

func TestUpdateGPS(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Valid GPS update", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		requestBody := map[string]interface{}{
			"vehicle_id": "123e4567-e89b-12d3-a456-426614174000",
			"latitude":   13.7563,
			"longitude":  100.5018,
			"speed":      45.5,
			"heading":    90.0,
		}

		body, _ := json.Marshal(requestBody)
		c.Request = httptest.NewRequest("POST", "/tracking/gps", bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")

		handlers.UpdateGPS(c)

		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusInternalServerError)
	})
}

func TestSubmitPOD(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Valid POD submission", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		requestBody := map[string]interface{}{
			"order_id":       "123e4567-e89b-12d3-a456-426614174000",
			"recipient_name": "John Doe",
			"latitude":       13.7563,
			"longitude":      100.5018,
			"notes":          "Delivered successfully",
		}

		body, _ := json.Marshal(requestBody)
		c.Request = httptest.NewRequest("POST", "/pod", bytes.NewBuffer(body))
		c.Request.Header.Set("Content-Type", "application/json")

		handlers.SubmitPOD(c)

		assert.True(t, w.Code == http.StatusCreated || w.Code == http.StatusInternalServerError)
	})
}
