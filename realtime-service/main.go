package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}

	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex

	redisClient *redis.Client
	ctx         = context.Background()
)

type GPSUpdate struct {
	VehicleID string  `json:"vehicle_id"`
	RouteID   string  `json:"route_id,omitempty"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Speed     float64 `json:"speed_kmh"`
	Heading   int     `json:"heading"`
	Timestamp string  `json:"timestamp"`
}

type Alert struct {
	Type      string                 `json:"type"`
	Severity  string                 `json:"severity"`
	VehicleID string                 `json:"vehicle_id"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data"`
	Timestamp string                 `json:"timestamp"`
}

func main() {
	// Connect to Redis
	redisClient = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	// Test Redis connection
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	log.Println("✅ Connected to Redis")

	// Setup Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "ai-tms-realtime",
			"version": "1.0.0",
		})
	})

	// WebSocket endpoint
	router.GET("/ws", handleWebSocket)

	// HTTP endpoints for GPS updates
	router.POST("/api/v1/gps", handleGPSUpdate)
	router.POST("/api/v1/alerts", handleAlert)

	// Subscribe to Redis pub/sub for broadcasting
	go subscribeToBroadcasts()

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("🚀 Real-time Service starting on port %s...\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// Register client
	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	log.Println("✅ New WebSocket client connected")

	// Remove client on disconnect
	defer func() {
		clientsMu.Lock()
		delete(clients, conn)
		clientsMu.Unlock()
		log.Println("❌ WebSocket client disconnected")
	}()

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func handleGPSUpdate(c *gin.Context) {
	var update GPSUpdate
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Add timestamp if not provided
	if update.Timestamp == "" {
		update.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// Store in Redis with TTL
	key := "gps:" + update.VehicleID
	data, _ := json.Marshal(update)
	redisClient.Set(ctx, key, data, 5*time.Minute)

	// Publish to Redis for broadcasting
	redisClient.Publish(ctx, "gps_updates", data)

	c.JSON(200, gin.H{"status": "success"})
}

func handleAlert(c *gin.Context) {
	var alert Alert
	if err := c.ShouldBindJSON(&alert); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Add timestamp if not provided
	if alert.Timestamp == "" {
		alert.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// Publish to Redis for broadcasting
	data, _ := json.Marshal(alert)
	redisClient.Publish(ctx, "alerts", data)

	c.JSON(200, gin.H{"status": "success"})
}

func subscribeToBroadcasts() {
	pubsub := redisClient.Subscribe(ctx, "gps_updates", "alerts")
	defer pubsub.Close()

	ch := pubsub.Channel()

	for msg := range ch {
		// Broadcast to all WebSocket clients
		clientsMu.Lock()
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			if err != nil {
				log.Println("Error broadcasting to client:", err)
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.Unlock()
	}
}
