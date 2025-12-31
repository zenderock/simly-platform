package core

import (
	"context"
	"fmt"

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
		// We continue anyway to try sending the email
	}

	// 2. Get Organization members emails
	users, err := s.store.GetUsersByOrganizationID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get users for alert: %w", err)
	}

	// 3. Format Email
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

	// 4. Send to each user
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

func (s *AlertService) ListAlerts(ctx context.Context, orgID int) ([]model.Alert, error) {
	return s.store.GetAlertsByOrganizationID(ctx, orgID)
}

func (s *AlertService) MarkAsRead(ctx context.Context, alertID int, orgID int) error {
	return s.store.MarkAlertAsRead(ctx, alertID, orgID)
}
