package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) GetBillingTrialSettings(ctx context.Context) (*model.BillingTrialSettings, error) {
	query := `
		SELECT id, enabled, target_plan_id, trial_days, starts_at, ends_at, require_payment_method, created_at, updated_at
		FROM billing_trial_settings
		WHERE id = 1
	`

	var settings model.BillingTrialSettings
	err := s.db.QueryRow(ctx, query).Scan(
		&settings.ID,
		&settings.Enabled,
		&settings.TargetPlanID,
		&settings.TrialDays,
		&settings.StartsAt,
		&settings.EndsAt,
		&settings.RequirePaymentMethod,
		&settings.CreatedAt,
		&settings.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get billing trial settings: %w", err)
	}

	return &settings, nil
}

func (s *Store) UpsertBillingTrialSettings(ctx context.Context, settings *model.BillingTrialSettings) error {
	query := `
		INSERT INTO billing_trial_settings (
			id, enabled, target_plan_id, trial_days, starts_at, ends_at, require_payment_method, created_at, updated_at
		)
		VALUES (1, $1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			enabled = EXCLUDED.enabled,
			target_plan_id = EXCLUDED.target_plan_id,
			trial_days = EXCLUDED.trial_days,
			starts_at = EXCLUDED.starts_at,
			ends_at = EXCLUDED.ends_at,
			require_payment_method = EXCLUDED.require_payment_method,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	return s.db.QueryRow(ctx, query,
		settings.Enabled,
		settings.TargetPlanID,
		settings.TrialDays,
		settings.StartsAt,
		settings.EndsAt,
		settings.RequirePaymentMethod,
	).Scan(&settings.ID, &settings.CreatedAt, &settings.UpdatedAt)
}

func (s *Store) MarkOrganizationTrialConsumed(ctx context.Context, orgID int, planID string, consumedAt time.Time) error {
	query := `
		UPDATE organizations
		SET trial_consumed_at = COALESCE(trial_consumed_at, $1),
		    trial_consumed_plan_id = COALESCE(trial_consumed_plan_id, $2),
		    updated_at = NOW()
		WHERE id = $3
	`

	result, err := s.db.Exec(ctx, query, consumedAt, planID, orgID)
	if err != nil {
		return fmt.Errorf("failed to mark organization trial consumed: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("organization not found")
	}

	return nil
}
