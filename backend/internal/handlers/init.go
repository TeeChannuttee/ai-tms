package handlers

import (
	"github.com/ai-tms/backend/internal/services"
)

var (
	notificationSvc *services.NotificationService
	auditSvc        *services.AuditService
)

// InitializeServices sets the service dependencies for all handlers
func InitializeServices(notif *services.NotificationService, audit *services.AuditService) {
	notificationSvc = notif
	auditSvc = audit
}
