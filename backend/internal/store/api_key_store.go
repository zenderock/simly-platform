package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateAPIKey(ctx context.Context, key *model.APIKey) error {
	query := `
		INSERT INTO api_keys (organization_id, application_id, name, key_hash, prefix, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query,
		key.OrganizationID,
		key.ApplicationID,
		key.Name,
		key.KeyHash,
		key.Prefix,
	).Scan(&key.ID, &key.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create api key: %w", err)
	}
	return nil
}

func (s *Store) GetAPIKeysByApplicationID(ctx context.Context, appID int) ([]model.APIKey, error) {
	query := `
		SELECT id, organization_id, application_id, name, prefix, last_used_at, created_at
		FROM api_keys
		WHERE application_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, appID)
	if err != nil {
		return nil, fmt.Errorf("failed to query api keys: %w", err)
	}
	defer rows.Close()

	var keys []model.APIKey
	for rows.Next() {
		var k model.APIKey
		if err := rows.Scan(
			&k.ID,
			&k.OrganizationID,
			&k.ApplicationID,
			&k.Name,
			&k.Prefix,
			&k.LastUsedAt,
			&k.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan api key: %w", err)
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (s *Store) DeleteAPIKey(ctx context.Context, id, orgID int) error {
	result, err := s.db.Exec(ctx, "DELETE FROM api_keys WHERE id = $1 AND organization_id = $2", id, orgID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("api key not found or unauthorized")
	}
	return nil
}
