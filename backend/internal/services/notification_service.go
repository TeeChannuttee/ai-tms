package services

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// NotificationService handles system notifications
type NotificationService struct {
	lineNotifyToken string
}

// NewNotificationService creates a new notification service
func NewNotificationService(lineNotifyToken string) *NotificationService {
	return &NotificationService{
		lineNotifyToken: lineNotifyToken,
	}
}

// SendLineNotification sends a message via LINE Notify
func (s *NotificationService) SendLineNotification(message string) error {
	if s.lineNotifyToken == "" {
		return fmt.Errorf("LINE Notify token not configured")
	}

	apiURL := "https://notify-api.line.me/api/notify"
	data := url.Values{}
	data.Set("message", message)

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+s.lineNotifyToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("LINE Notify API returned status: %d", resp.StatusCode)
	}

	return nil
}

// NotifyDriverAssignment notifies a driver about a new assignment
func (s *NotificationService) NotifyDriverAssignment(driverName, routeID string, stopCount int) error {
	msg := fmt.Sprintf("\n[AI-TMS Alert] 🚛\nHelloคุณ %s,\nคุณได้รับมอบหมายงานใหม่!\nRoute ID: %s\nจำนวนจุดส่ง: %d จุด\nตรวจสอบรายละเอียดได้ใน App เลยครับ!",
		driverName, routeID, stopCount)
	return s.SendLineNotification(msg)
}
