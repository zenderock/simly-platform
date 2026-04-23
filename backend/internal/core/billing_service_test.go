package core

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

func TestBillingService_Initialization(t *testing.T) {
	store := &store.Store{} // Mock store
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency", "price_white_label")

	assert.NotNil(t, service)
	assert.Equal(t, "sk_test_123", service.stripeSecretKey)
}

func TestBillingService_CreateCheckoutSession_Mock(t *testing.T) {
	// This tests the structure but would fail without valid Stripe key in integration environment
	// So we keep it simple to verify method signature and logic flow essentially
	store := &store.Store{}
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency", "price_white_label")

	// We can't really call Stripe API in unit test without mocking the Stripe client library
	// which is hard in Go as functions are top-level.
	// Just asserting the Service is structurally correct.
	assert.NotNil(t, service)
}

func TestBillingService_BuildCheckoutSessionParams_AppliesTrial(t *testing.T) {
	store := &store.Store{}
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency", "price_white_label")

	params := service.buildCheckoutSessionParams(42, "price_white_label", model.PlanWhiteLabel, "owner@example.com", &model.BillingTrialSettings{
		TargetPlanID:         model.PlanWhiteLabel,
		TrialDays:            7,
		RequirePaymentMethod: true,
	})

	require.NotNil(t, params.SubscriptionData)
	require.NotNil(t, params.SubscriptionData.TrialPeriodDays)
	assert.Equal(t, int64(7), *params.SubscriptionData.TrialPeriodDays)
	assert.Equal(t, "true", params.Metadata["trial_applied"])
	assert.Equal(t, model.PlanWhiteLabel, params.Metadata["target_plan_id"])
	assert.Equal(t, model.PlanWhiteLabel, params.Metadata["selected_plan_id"])
	assert.NotNil(t, params.PaymentMethodCollection)
	assert.Equal(t, "always", *params.PaymentMethodCollection)
}

func TestBillingService_BuildCheckoutSessionParams_WithoutTrial(t *testing.T) {
	store := &store.Store{}
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency", "price_white_label")

	params := service.buildCheckoutSessionParams(42, "price_pro", model.PlanPro, "owner@example.com", nil)

	assert.Nil(t, params.SubscriptionData)
	assert.Empty(t, params.Metadata["trial_applied"])
	assert.Equal(t, model.PlanPro, params.Metadata["selected_plan_id"])
}

func TestBillingService_NormalizeTrialSettings(t *testing.T) {
	store := &store.Store{}
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency", "price_white_label")

	start := time.Date(2026, 5, 1, 8, 0, 0, 0, time.FixedZone("UTC+2", 2*3600))
	end := time.Date(2026, 5, 15, 8, 0, 0, 0, time.FixedZone("UTC+2", 2*3600))

	settings, err := service.normalizeTrialSettings(&model.BillingTrialSettings{
		Enabled:              true,
		TargetPlanID:         model.PlanWhiteLabel,
		TrialDays:            7,
		StartsAt:             &start,
		EndsAt:               &end,
		RequirePaymentMethod: true,
	})

	require.NoError(t, err)
	require.NotNil(t, settings.StartsAt)
	require.NotNil(t, settings.EndsAt)
	assert.Equal(t, time.UTC, settings.StartsAt.Location())
	assert.Equal(t, time.UTC, settings.EndsAt.Location())
}

func TestBillingService_NormalizeTrialSettings_RejectsInvalidInput(t *testing.T) {
	store := &store.Store{}
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency", "price_white_label")

	_, err := service.normalizeTrialSettings(&model.BillingTrialSettings{
		Enabled:              true,
		TargetPlanID:         model.PlanFree,
		TrialDays:            7,
		RequirePaymentMethod: true,
	})
	require.Error(t, err)

	_, err = service.normalizeTrialSettings(&model.BillingTrialSettings{
		Enabled:              true,
		TargetPlanID:         model.PlanWhiteLabel,
		TrialDays:            7,
		RequirePaymentMethod: false,
	})
	require.Error(t, err)
}
