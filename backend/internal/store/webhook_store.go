package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateWebhook(ctx context.Context, wh *model.Webhook) error {
	query := `
		INSERT INTO webhooks (organization_id, application_id, url, secret, event_types, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query, wh.OrganizationID, wh.ApplicationID, wh.URL, wh.Secret, wh.EventTypes).Scan(&wh.ID, &wh.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create webhook: %w", err)
	}
	return nil
}

func (s *Store) GetWebhooksByOrganizationID(ctx context.Context, orgID int) ([]model.Webhook, error) {
	query := `SELECT id, organization_id, application_id, url, secret, event_types, created_at FROM webhooks WHERE organization_id = $1`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var webhooks []model.Webhook
	for rows.Next() {
		var w model.Webhook
		if err := rows.Scan(&w.ID, &w.OrganizationID, &w.ApplicationID, &w.URL, &w.Secret, &w.EventTypes, &w.CreatedAt); err != nil {
			return nil, err
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
}

func (s *Store) DeleteWebhook(ctx context.Context, webhookID, orgID int) error {
	query := `DELETE FROM webhooks WHERE id = $1 AND organization_id = $2`
	result, err := s.db.Exec(ctx, query, webhookID, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("webhook not found")
	}
	return nil
}
