package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateApplication(ctx context.Context, app *model.Application) error {
	query := `
		INSERT INTO applications (organization_id, name, is_sandbox, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query, app.OrganizationID, app.Name, app.IsSandbox).Scan(&app.ID, &app.CreatedAt, &app.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create application: %w", err)
	}
	return nil
}

func (s *Store) GetApplicationsByOrganizationID(ctx context.Context, orgID int) ([]model.Application, error) {
	query := `
		SELECT id, organization_id, name, is_sandbox, created_at, updated_at
		FROM applications
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query applications: %w", err)
	}
	defer rows.Close()

	var apps []model.Application
	for rows.Next() {
		var a model.Application
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.Name, &a.IsSandbox, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan application: %w", err)
		}
		apps = append(apps, a)
	}
	return apps, nil
}

func (s *Store) GetApplicationByID(ctx context.Context, id int) (*model.Application, error) {
	query := `SELECT id, organization_id, name, is_sandbox, created_at, updated_at FROM applications WHERE id = $1`
	var app model.Application
	err := s.db.QueryRow(ctx, query, id).Scan(&app.ID, &app.OrganizationID, &app.Name, &app.IsSandbox, &app.CreatedAt, &app.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get application: %w", err)
	}
	return &app, nil
}

func (s *Store) UpdateApplication(ctx context.Context, appID, orgID int, name string) error {
	query := `UPDATE applications SET name = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`
	result, err := s.db.Exec(ctx, query, name, appID, orgID)
	if err != nil {
		return fmt.Errorf("failed to update application: %w", err)
	}
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

func (s *Store) DeleteApplication(ctx context.Context, appID, orgID int) error {
	query := `DELETE FROM applications WHERE id = $1 AND organization_id = $2`
	result, err := s.db.Exec(ctx, query, appID, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete application: %w", err)
	}
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

func (s *Store) CountApplicationsByOrganization(ctx context.Context, orgID int) (int, error) {
	query := `SELECT COUNT(*) FROM applications WHERE organization_id = $1`
	var count int
	err := s.db.QueryRow(ctx, query, orgID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count applications: %w", err)
	}
	return count, nil
}
