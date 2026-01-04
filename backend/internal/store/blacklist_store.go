package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) AddToBlacklist(ctx context.Context, orgID int, phoneNumber string) error {
	query := `
		INSERT INTO blacklists (organization_id, phone_number, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (organization_id, phone_number) DO NOTHING
	`
	_, err := s.db.Exec(ctx, query, orgID, phoneNumber)
	if err != nil {
		return fmt.Errorf("failed to add to blacklist: %w", err)
	}
	return nil
}

func (s *Store) RemoveFromBlacklist(ctx context.Context, orgID int, phoneNumber string) error {
	query := `
		DELETE FROM blacklists
		WHERE organization_id = $1 AND phone_number = $2
	`
	_, err := s.db.Exec(ctx, query, orgID, phoneNumber)
	if err != nil {
		return fmt.Errorf("failed to remove from blacklist: %w", err)
	}
	return nil
}

func (s *Store) IsBlacklisted(ctx context.Context, orgID int, phoneNumber string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM blacklists
			WHERE organization_id = $1 AND phone_number = $2
		)
	`
	var exists bool
	err := s.db.QueryRow(ctx, query, orgID, phoneNumber).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check blacklist: %w", err)
	}
	return exists, nil
}

func (s *Store) GetBlacklistByOrganizationID(ctx context.Context, orgID int) ([]model.Blacklist, error) {
	query := `
		SELECT id, organization_id, phone_number, created_at
		FROM blacklists
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query blacklist: %w", err)
	}
	defer rows.Close()

	var blacklist []model.Blacklist
	for rows.Next() {
		var b model.Blacklist
		if err := rows.Scan(&b.ID, &b.OrganizationID, &b.PhoneNumber, &b.CreatedAt); err != nil {
			return nil, err
		}
		blacklist = append(blacklist, b)
	}
	return blacklist, nil
}
