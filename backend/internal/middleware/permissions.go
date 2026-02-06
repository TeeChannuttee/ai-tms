package middleware

import (
	"github.com/ai-tms/backend/internal/models"
)

// Permission represents an action that can be performed
type Permission string

const (
	// User management
	PermissionUserCreate Permission = "user.create"
	PermissionUserRead   Permission = "user.read"
	PermissionUserUpdate Permission = "user.update"
	PermissionUserDelete Permission = "user.delete"

	// Order management
	PermissionOrderCreate Permission = "order.create"
	PermissionOrderRead   Permission = "order.read"
	PermissionOrderUpdate Permission = "order.update"
	PermissionOrderDelete Permission = "order.delete"
	PermissionOrderImport Permission = "order.import"

	// Route/Plan management
	PermissionRouteCreate   Permission = "route.create"
	PermissionRouteRead     Permission = "route.read"
	PermissionRouteUpdate   Permission = "route.update"
	PermissionRouteDelete   Permission = "route.delete"
	PermissionRoutePublish  Permission = "route.publish"
	PermissionRouteOptimize Permission = "route.optimize"

	// Vehicle management
	PermissionVehicleCreate Permission = "vehicle.create"
	PermissionVehicleRead   Permission = "vehicle.read"
	PermissionVehicleUpdate Permission = "vehicle.update"
	PermissionVehicleDelete Permission = "vehicle.delete"

	// Driver management
	PermissionDriverCreate Permission = "driver.create"
	PermissionDriverRead   Permission = "driver.read"
	PermissionDriverUpdate Permission = "driver.update"
	PermissionDriverDelete Permission = "driver.delete"

	// Dispatch
	PermissionDispatchAssign   Permission = "dispatch.assign"
	PermissionDispatchReassign Permission = "dispatch.reassign"
	PermissionDispatchView     Permission = "dispatch.view"

	// Tracking
	PermissionTrackingView   Permission = "tracking.view"
	PermissionTrackingUpdate Permission = "tracking.update"

	// POD
	PermissionPODCreate Permission = "pod.create"
	PermissionPODRead   Permission = "pod.read"
	PermissionPODUpdate Permission = "pod.update"
	PermissionPODVerify Permission = "pod.verify"

	// Analytics
	PermissionAnalyticsView   Permission = "analytics.view"
	PermissionAnalyticsExport Permission = "analytics.export"

	// Audit logs
	PermissionAuditView Permission = "audit.view"

	// API keys
	PermissionAPIKeyCreate Permission = "apikey.create"
	PermissionAPIKeyRead   Permission = "apikey.read"
	PermissionAPIKeyRevoke Permission = "apikey.revoke"
)

// RolePermissions defines permissions for each role
var RolePermissions = map[string][]Permission{
	"admin": {
		// Full access to everything
		PermissionUserCreate, PermissionUserRead, PermissionUserUpdate, PermissionUserDelete,
		PermissionOrderCreate, PermissionOrderRead, PermissionOrderUpdate, PermissionOrderDelete, PermissionOrderImport,
		PermissionRouteCreate, PermissionRouteRead, PermissionRouteUpdate, PermissionRouteDelete, PermissionRoutePublish, PermissionRouteOptimize,
		PermissionVehicleCreate, PermissionVehicleRead, PermissionVehicleUpdate, PermissionVehicleDelete,
		PermissionDriverCreate, PermissionDriverRead, PermissionDriverUpdate, PermissionDriverDelete,
		PermissionDispatchAssign, PermissionDispatchReassign, PermissionDispatchView,
		PermissionTrackingView, PermissionTrackingUpdate,
		PermissionPODCreate, PermissionPODRead, PermissionPODUpdate, PermissionPODVerify,
		PermissionAnalyticsView, PermissionAnalyticsExport,
		PermissionAuditView,
		PermissionAPIKeyCreate, PermissionAPIKeyRead, PermissionAPIKeyRevoke,
	},
	"planner": {
		// Planning and optimization
		PermissionOrderRead, PermissionOrderImport,
		PermissionRouteCreate, PermissionRouteRead, PermissionRouteUpdate, PermissionRouteOptimize,
		PermissionVehicleRead,
		PermissionDriverRead,
		PermissionDispatchView,
		PermissionTrackingView,
		PermissionPODRead,
		PermissionAnalyticsView,
	},
	"dispatcher": {
		// Dispatch and monitoring
		PermissionOrderRead,
		PermissionRouteRead, PermissionRoutePublish,
		PermissionVehicleRead,
		PermissionDriverRead,
		PermissionDispatchAssign, PermissionDispatchReassign, PermissionDispatchView,
		PermissionTrackingView,
		PermissionPODRead, PermissionPODVerify,
		PermissionAnalyticsView,
	},
	"driver": {
		// Driver operations
		PermissionOrderRead,
		PermissionRouteRead,
		PermissionTrackingUpdate,
		PermissionPODCreate, PermissionPODRead,
	},
	"customer": {
		// Customer portal
		PermissionOrderRead,
		PermissionTrackingView,
		PermissionPODRead,
	},
}

// HasPermission checks if a user has a specific permission
func HasPermission(user *models.User, permission Permission) bool {
	if user == nil {
		return false
	}

	permissions, exists := RolePermissions[user.Role]
	if !exists {
		return false
	}

	for _, p := range permissions {
		if p == permission {
			return true
		}
	}

	return false
}

// HasAnyPermission checks if user has at least one of the given permissions
func HasAnyPermission(user *models.User, permissions ...Permission) bool {
	for _, permission := range permissions {
		if HasPermission(user, permission) {
			return true
		}
	}
	return false
}

// HasAllPermissions checks if user has all of the given permissions
func HasAllPermissions(user *models.User, permissions ...Permission) bool {
	for _, permission := range permissions {
		if !HasPermission(user, permission) {
			return false
		}
	}
	return true
}
