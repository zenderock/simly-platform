package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

// CreateAppDID creates a new DID assignment for an application
func (s *Store) CreateAppDID(ctx context.Context, appDID *model.AppDID) error {
	query := `
		INSERT INTO app_dids (application_id, did_number, description, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query,
		appDID.ApplicationID,
		appDID.DIDNumber,
		appDID.Description,
		appDID.IsActive,
	).Scan(&appDID.ID, &appDID.CreatedAt, &appDID.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create app DID: %w", err)
	}
	return nil
}

// GetAppDIDByID retrieves a DID assignment by ID
func (s *Store) GetAppDIDByID(ctx context.Context, id int) (*model.AppDID, error) {
	query := `
		SELECT id, application_id, did_number, description, is_active, created_at, updated_at
		FROM app_dids
		WHERE id = $1
	`
	var appDID model.AppDID
	err := s.db.QueryRow(ctx, query, id).Scan(
		&appDID.ID,
		&appDID.ApplicationID,
		&appDID.DIDNumber,
		&appDID.Description,
		&appDID.IsActive,
		&appDID.CreatedAt,
		&appDID.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get app DID: %w", err)
	}
	return &appDID, nil
}

// GetAppDIDByNumber retrieves a DID assignment by phone number
func (s *Store) GetAppDIDByNumber(ctx context.Context, didNumber string) (*model.AppDID, error) {
	query := `
		SELECT id, application_id, did_number, description, is_active, created_at, updated_at
		FROM app_dids
		WHERE did_number = $1 AND is_active = true
	`
	var appDID model.AppDID
	err := s.db.QueryRow(ctx, query, didNumber).Scan(
		&appDID.ID,
		&appDID.ApplicationID,
		&appDID.DIDNumber,
		&appDID.Description,
		&appDID.IsActive,
		&appDID.CreatedAt,
		&appDID.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get app DID by number: %w", err)
	}
	return &appDID, nil
}

// ListAppDIDsByApplicationID retrieves all DID assignments for an application
func (s *Store) ListAppDIDsByApplicationID(ctx context.Context, applicationID int) ([]model.AppDID, error) {
	query := `
		SELECT id, application_id, did_number, description, is_active, created_at, updated_at
		FROM app_dids
		WHERE application_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, applicationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list app DIDs: %w", err)
	}
	defer rows.Close()

	var appDIDs []model.AppDID
	for rows.Next() {
		var appDID model.AppDID
		if err := rows.Scan(
			&appDID.ID,
			&appDID.ApplicationID,
			&appDID.DIDNumber,
			&appDID.Description,
			&appDID.IsActive,
			&appDID.CreatedAt,
			&appDID.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan app DID: %w", err)
		}
		appDIDs = append(appDIDs, appDID)
	}
	return appDIDs, nil
}

// ListAppDIDsByOrganizationID retrieves all DID assignments for an organization
func (s *Store) ListAppDIDsByOrganizationID(ctx context.Context, orgID int) ([]model.AppDID, error) {
	query := `
		SELECT ad.id, ad.application_id, ad.did_number, ad.description, ad.is_active, ad.created_at, ad.updated_at
		FROM app_dids ad
		JOIN applications a ON ad.application_id = a.id
		WHERE a.organization_id = $1
		ORDER BY ad.created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list app DIDs by organization: %w", err)
	}
	defer rows.Close()

	var appDIDs []model.AppDID
	for rows.Next() {
		var appDID model.AppDID
		if err := rows.Scan(
			&appDID.ID,
			&appDID.ApplicationID,
			&appDID.DIDNumber,
			&appDID.Description,
			&appDID.IsActive,
			&appDID.CreatedAt,
			&appDID.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan app DID: %w", err)
		}
		appDIDs = append(appDIDs, appDID)
	}
	return appDIDs, nil
}

// UpdateAppDID updates a DID assignment
func (s *Store) UpdateAppDID(ctx context.Context, id int, req *model.UpdateAppDIDRequest) error {
	query := `
		UPDATE app_dids
		SET description = $1, is_active = $2, updated_at = NOW()
		WHERE id = $3
	`
	result, err := s.db.Exec(ctx, query, req.Description, req.IsActive, id)
	if err != nil {
		return fmt.Errorf("failed to update app DID: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("app DID not found")
	}
	return nil
}

// DeleteAppDID deletes a DID assignment
func (s *Store) DeleteAppDID(ctx context.Context, id int, orgID int) error {
	query := `
		DELETE FROM app_dids
		WHERE id = $1 AND application_id IN (
			SELECT id FROM applications WHERE organization_id = $2
		)
	`
	result, err := s.db.Exec(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete app DID: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("app DID not found or unauthorized")
	}
	return nil
}
