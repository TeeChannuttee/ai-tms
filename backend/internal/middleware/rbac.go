package middleware

import (
	"net/http"

	"github.com/ai-tms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RequirePermission middleware checks if user has required permission
func RequirePermission(permission Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		userModel, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
			c.Abort()
			return
		}

		if !HasPermission(userModel, permission) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":               "Insufficient permissions",
				"required_permission": permission,
				"user_role":           userModel.Role,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyPermission middleware checks if user has at least one of the permissions
func RequireAnyPermission(permissions ...Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		userModel, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
			c.Abort()
			return
		}

		if !HasAnyPermission(userModel, permissions...) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":                "Insufficient permissions",
				"required_permissions": permissions,
				"user_role":            userModel.Role,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAllPermissions middleware checks if user has all of the permissions
func RequireAllPermissions(permissions ...Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		userModel, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
			c.Abort()
			return
		}

		if !HasAllPermissions(userModel, permissions...) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":                "Insufficient permissions",
				"required_permissions": permissions,
				"user_role":            userModel.Role,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole middleware checks if user has specific role
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		userModel, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
			c.Abort()
			return
		}

		hasRole := false
		for _, role := range roles {
			if userModel.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error":          "Insufficient role",
				"required_roles": roles,
				"user_role":      userModel.Role,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
