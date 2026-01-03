package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type AlertService struct {
	store         *store.Store
	emailProvider EmailProvider
}

func NewAlertService(store *store.Store, emailProvider EmailProvider) *AlertService {
	return &AlertService{
		store:         store,
		emailProvider: emailProvider,
	}
}

// NotifyOrganization sends an alert via email and records it in the database
func (s *AlertService) NotifyOrganization(ctx context.Context, orgID int, alertType string, title string, message string, severity string) error {
	// 1. Record alert in DB
	alert := &model.Alert{
		OrganizationID: orgID,
		Type:           alertType,
		Severity:       severity,
		Title:          title,
		Message:        message,
		IsRead:         false,
	}
	if err := s.store.CreateAlert(ctx, alert); err != nil {
		fmt.Printf("Failed to record alert in DB: %v\n", err)
	}

	// 2. Fetch Applications to see if we should send Slack/Ntfy instead of Email
	apps, err := s.store.GetApplicationsByOrganizationID(ctx, orgID)
	if err != nil {
		fmt.Printf("Failed to fetch applications for alert routing: %v\n", err)
	}

	externalAlertSent := false

	// 3. Send to configured external channels (Slack/Ntfy)
	for _, app := range apps {
		if app.SlackWebhookURL != nil && *app.SlackWebhookURL != "" {
			go s.SendSlackAlert(*app.SlackWebhookURL, title, message, severity)
			externalAlertSent = true
		}
		if app.NtfyTopic != nil && *app.NtfyTopic != "" {
			go s.SendNtfyAlert(*app.NtfyTopic, title, message, severity)
			externalAlertSent = true
		}
	}

	// 4. If we successfully sent an external alert AND the type is 'device_offline' or 'low_battery' (cost reduction), skip email
	// Or maybe we want to skip email for all alerts if external is configured? user said "pour l'envoie des alertes comme ca" (offline)
	if externalAlertSent && (alertType == "device_offline" || alertType == "low_battery") {
		// log.Printf("Skipping email alert for org %d (external channel used)", orgID)
		return nil
	}

	// 5. Get Organization members emails (Fallback or Parallel)
	users, err := s.store.GetUsersByOrganizationID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get users for alert: %w", err)
	}

	// 6. Format Email
	subject := fmt.Sprintf("[%s] Simly Alert: %s", severity, title)
	htmlContent := fmt.Sprintf(`
		<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
			<h2 style="color: #6e3ff3;">Simly Alert</h2>
			<p><strong>Severity:</strong> %s</p>
			<p><strong>Type:</strong> %s</p>
			<p><strong>Message:</strong> %s</p>
			<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
			<p style="font-size: 12px; color: #666;">This is an automated alert from Simly Platform.</p>
		</div>
	`, severity, alertType, message)

	// 7. Send to each user
	for _, user := range users {
		if user.Email != "" {
			err := s.emailProvider.SendEmail(ctx, user.Email, subject, htmlContent)
			if err != nil {
				fmt.Printf("Failed to send alert email to %s: %v\n", user.Email, err)
			}
		}
	}

	return nil
}

func (s *AlertService) SendSlackAlert(webhookURL, title, message, severity string) {
	// Simple Slack Block Kit or Text
	payload := map[string]interface{}{
		"text": fmt.Sprintf("*%s*\n%s\nScanning Severity: %s", title, message, severity),
	}
	body, _ := json.Marshal(payload)
	_, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Printf("Failed to send Slack alert: %v\n", err)
	}
}

func (s *AlertService) SendNtfyAlert(topic, title, message, severity string) {
	// Ntfy.sh (POST /topic)
	// Priority based on severity: 5 (max) for error/warning
	priority := 3
	tags := []string{"simly"}
	if severity == "error" || severity == "warning" {
		priority = 4
		tags = append(tags, "warning", "skull")
	}

	req, _ := http.NewRequest("POST", fmt.Sprintf("https://ntfy.sh/%s", topic), strings.NewReader(message))
	req.Header.Set("Title", title)
	req.Header.Set("Priority", fmt.Sprintf("%d", priority))
	req.Header.Set("Tags", strings.Join(tags, ","))

	_, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Printf("Failed to send Ntfy alert: %v\n", err)
	}
}

func (s *AlertService) ListAlerts(ctx context.Context, orgID int) ([]model.Alert, error) {
	return s.store.GetAlertsByOrganizationID(ctx, orgID)
}

func (s *AlertService) MarkAsRead(ctx context.Context, alertID int, orgID int) error {
	return s.store.MarkAlertAsRead(ctx, alertID, orgID)
}
