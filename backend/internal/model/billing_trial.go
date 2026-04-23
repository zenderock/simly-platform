package model

import "time"

type BillingTrialSettings struct {
	ID                   int        `json:"id"`
	Enabled              bool       `json:"enabled"`
	TargetPlanID         string     `json:"target_plan_id"`
	TrialDays            int        `json:"trial_days"`
	StartsAt             *time.Time `json:"starts_at,omitempty"`
	EndsAt               *time.Time `json:"ends_at,omitempty"`
	RequirePaymentMethod bool       `json:"require_payment_method"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

func (s *BillingTrialSettings) IsActiveAt(now time.Time) bool {
	if s == nil || !s.Enabled || s.TargetPlanID == "" || s.TrialDays <= 0 || !s.RequirePaymentMethod {
		return false
	}
	if s.StartsAt != nil && now.Before(*s.StartsAt) {
		return false
	}
	if s.EndsAt != nil && !now.Before(*s.EndsAt) {
		return false
	}
	return true
}
