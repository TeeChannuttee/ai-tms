package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/middleware"
	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents registration data
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	User         UserDTO   `json:"user"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// UserDTO represents user data transfer object
type UserDTO struct {
	ID       string `json:"id"`
	DriverID string `json:"driver_id,omitempty"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

// Login handles user authentication
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[AUTH] Login attempt for: %s", req.Email)

	// Find user
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		log.Printf("[AUTH] User not found: %s", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		log.Printf("[AUTH] Password mismatch for: %s", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Generate refresh token (valid for 7 days)
	refreshToken, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	userDTO := UserDTO{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
		Role:  user.Role,
	}

	// If user is a driver, fetch their driver profile ID
	if user.Role == "driver" {
		var driver models.Driver
		if err := database.DB.Where("user_id = ?", user.ID).First(&driver).Error; err == nil {
			userDTO.DriverID = driver.ID.String()
		}
	}

	response := LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userDTO,
		ExpiresAt:    time.Now().Add(24 * time.Hour),
	}

	c.JSON(http.StatusOK, response)
}

// Register handles user registration
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := models.User{
		ID:       uuid.New(),
		Email:    req.Email,
		Password: string(hashedPassword),
		Name:     req.Name,
		Role:     req.Role,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate token
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	response := LoginResponse{
		Token: token,
		User: UserDTO{
			ID:    user.ID.String(),
			Email: user.Email,
			Name:  user.Name,
			Role:  user.Role,
		},
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	c.JSON(http.StatusCreated, response)
}

// RefreshToken handles token refresh
func RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user info from context (set by AuthMiddleware)
	userID, _ := c.Get("user_id")
	email, _ := c.Get("user_email")
	role, _ := c.Get("user_role")

	// Generate new token
	token, err := middleware.GenerateToken(userID.(uuid.UUID), email.(string), role.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_at": time.Now().Add(24 * time.Hour),
	})
}

// GetMe returns current user information
func GetMe(c *gin.Context) {
	userID := c.GetString("user_id")

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, UserDTO{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
		Role:  user.Role,
	})
}
