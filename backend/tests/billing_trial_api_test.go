package tests

import (
	"net/http"
	"testing"
)

type billingTrialSettingsResponse struct {
	ID                   int     `json:"id"`
	Enabled              bool    `json:"enabled"`
	TargetPlanID         string  `json:"target_plan_id"`
	TrialDays            int     `json:"trial_days"`
	StartsAt             *string `json:"starts_at"`
	EndsAt               *string `json:"ends_at"`
	RequirePaymentMethod bool    `json:"require_payment_method"`
}

func TestBillingTrialSettingsAPI(t *testing.T) {
	env := requirePublicAPITestEnv(t)

	t.Run("rejects missing admin secret", func(t *testing.T) {
		rr := env.executeRequest(t, http.MethodGet, "/api/internal/billing/trial-settings", nil, nil)
		assertStatus(t, rr, http.StatusUnauthorized)
	})

	t.Run("validates trial settings payload", func(t *testing.T) {
		rr := env.executeJSONRequest(t, http.MethodPut, "/api/internal/billing/trial-settings", map[string]any{
			"enabled":                true,
			"target_plan_id":         "free",
			"trial_days":             7,
			"require_payment_method": true,
		}, adminBillingHeaders())
		assertStatus(t, rr, http.StatusBadRequest)
		assertBodyContains(t, rr, "valid paid plan")
	})

	t.Run("creates and returns billing trial settings", func(t *testing.T) {
		rr := env.executeJSONRequest(t, http.MethodPut, "/api/internal/billing/trial-settings", map[string]any{
			"enabled":                true,
			"target_plan_id":         "white_label",
			"trial_days":             7,
			"starts_at":              "2026-05-01T00:00:00Z",
			"ends_at":                "2026-05-15T00:00:00Z",
			"require_payment_method": true,
		}, adminBillingHeaders())
		assertStatus(t, rr, http.StatusOK)

		resp := decodeJSON[billingTrialSettingsResponse](t, rr)
		if resp.TargetPlanID != "white_label" {
			t.Fatalf("expected white_label target plan, got %q", resp.TargetPlanID)
		}
		if !resp.Enabled {
			t.Fatal("expected billing trial to be enabled")
		}
		if resp.TrialDays != 7 {
			t.Fatalf("expected 7 trial days, got %d", resp.TrialDays)
		}
	})

	t.Run("reads billing trial settings", func(t *testing.T) {
		rr := env.executeRequest(t, http.MethodGet, "/api/internal/billing/trial-settings", nil, adminBillingHeaders())
		assertStatus(t, rr, http.StatusOK)

		resp := decodeJSON[billingTrialSettingsResponse](t, rr)
		if resp.TargetPlanID != "white_label" {
			t.Fatalf("expected white_label target plan, got %q", resp.TargetPlanID)
		}
		if resp.EndsAt == nil || *resp.EndsAt == "" {
			t.Fatal("expected ends_at to be returned")
		}
	})
}

func adminBillingHeaders() map[string]string {
	return map[string]string{
		"X-Admin-Secret": "test-billing-admin-secret",
		"Content-Type":   "application/json",
	}
}
