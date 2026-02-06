package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ai-tms/backend/internal/database"
	"github.com/ai-tms/backend/internal/models"
	"github.com/google/uuid"
)

type AuditService struct{}

func NewAuditService() *AuditService {
	return &AuditService{}
}

func (s *AuditService) LogAction(
	userID uuid.UUID,
	action string,
	entityType string,
	entityID uuid.UUID,
	changes interface{},
	ipAddress string,
	userAgent string,
) error {
	changesJSON, err := json.Marshal(changes)
	if err != nil {
		return fmt.Errorf("failed to marshal changes: %w", err)
	}

	auditLog := models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Changes:    string(changesJSON),
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		CreatedAt:  time.Now(),
	}

	if err := database.DB.Create(&auditLog).Error; err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

func (s *AuditService) LogOrderAction(userID uuid.UUID, action string, orderID uuid.UUID, changes interface{}, ip, ua string) error {
	return s.LogAction(userID, action, "order", orderID, changes, ip, ua)
}

func (s *AuditService) LogRouteAction(userID uuid.UUID, action string, routeID uuid.UUID, changes interface{}, ip, ua string) error {
	return s.LogAction(userID, action, "route", routeID, changes, ip, ua)
}

func (s *AuditService) GetAuditLogs(
	userID *uuid.UUID,
	action *string,
	entityType *string,
	from *time.Time,
	to *time.Time,
	limit int,
	offset int,
) ([]models.AuditLog, int64, error) {
	query := database.DB.Model(&models.AuditLog{}).Preload("User")

	if userID != nil {
		query = query.Where("user_id = ?", userID)
	}
	if action != nil {
		query = query.Where("action = ?", action)
	}
	if entityType != nil {
		query = query.Where("entity_type = ?", entityType)
	}
	if from != nil {
		query = query.Where("created_at >= ?", from)
	}
	if to != nil {
		query = query.Where("created_at <= ?", to)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	var logs []models.AuditLog
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch audit logs: %w", err)
	}

	return logs, total, nil
}

func (s *AuditService) GetEntityHistory(entityType string, entityID uuid.UUID) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	if err := database.DB.Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at DESC").
		Preload("User").
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch entity history: %w", err)
	}

	return logs, nil
}
