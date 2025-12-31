package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateAlert(ctx context.Context, alert *model.Alert) error {
	query := `
		INSERT INTO alerts (organization_id, type, severity, title, message, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query,
		alert.OrganizationID,
		alert.Type,
		alert.Severity,
		alert.Title,
		alert.Message,
		alert.IsRead,
	).Scan(&alert.ID, &alert.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create alert: %w", err)
	}
	return nil
}

func (s *Store) GetAlertsByOrganizationID(ctx context.Context, orgID int) ([]model.Alert, error) {
	query := `
		SELECT id, organization_id, type, severity, title, message, is_read, created_at
		FROM alerts
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query alerts: %w", err)
	}
	defer rows.Close()

	var alerts []model.Alert
	for rows.Next() {
		var a model.Alert
		if err := rows.Scan(
			&a.ID,
			&a.OrganizationID,
			&a.Type,
			&a.Severity,
			&a.Title,
			&a.Message,
			&a.IsRead,
			&a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan alert: %w", err)
		}
		alerts = append(alerts, a)
	}
	return alerts, nil
}

func (s *Store) MarkAlertAsRead(ctx context.Context, alertID int, orgID int) error {
	query := `UPDATE alerts SET is_read = TRUE WHERE id = $1 AND organization_id = $2`
	_, err := s.db.Exec(ctx, query, alertID, orgID)
	return err
}
