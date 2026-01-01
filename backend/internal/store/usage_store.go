package store

import (
	"context"
)

func (s *Store) IncrementUsageLedger(ctx context.Context, appID, orgID int, period string) error {
	query := `
		INSERT INTO usage_ledger (organization_id, application_id, period, sms_count, created_at, updated_at)
		VALUES ($1, $2, $3, 1, NOW(), NOW())
		ON CONFLICT (application_id, period) 
		DO UPDATE SET sms_count = usage_ledger.sms_count + 1, updated_at = NOW()
	`
	_, err := s.db.Exec(ctx, query, orgID, appID, period)
	return err
}

func (s *Store) GetUsage(ctx context.Context, appID int, period string) (int, error) {
	query := `SELECT sms_count FROM usage_ledger WHERE application_id = $1 AND period = $2`
	var count int
	err := s.db.QueryRow(ctx, query, appID, period).Scan(&count)
	if err != nil {
		return 0, nil // Handle any error (no rows or other) as 0 for safety in rate limiting
	}
	return count, nil
}

func (s *Store) GetOrganizationUsage(ctx context.Context, orgID int, period string) (int, error) {
	query := `SELECT COALESCE(SUM(sms_count), 0) FROM usage_ledger WHERE organization_id = $1 AND period = $2`
	var count int
	err := s.db.QueryRow(ctx, query, orgID, period).Scan(&count)
	if err != nil {
		return 0, nil
	}
	return count, nil
}
