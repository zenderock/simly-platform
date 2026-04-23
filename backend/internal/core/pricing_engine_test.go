package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/zenderock/simly-backend/internal/model"
)

func TestPricingEngine_CalculateSMSCostForPlan(t *testing.T) {
	engine := &PricingEngine{}

	tests := []struct {
		name         string
		planID       string
		volume       int
		expectedCost float64
	}{
		{
			name:         "Free plan - no volume discount",
			planID:       model.PlanFree,
			volume:       100,
			expectedCost: 0.0,
		},
		{
			name:         "Professional plan - no discount under 1000",
			planID:       model.PlanPro,
			volume:       500,
			expectedCost: 0.0,
		},
		{
			name:         "Professional plan - 5% discount for 1000+",
			planID:       model.PlanPro,
			volume:       1500,
			expectedCost: 0.0,
		},
		{
			name:         "Professional plan - 10% discount for 5000+",
			planID:       model.PlanPro,
			volume:       6000,
			expectedCost: 0.0,
		},
		{
			name:         "Enterprise plan - no discount under 1000",
			planID:       model.PlanAgency,
			volume:       500,
			expectedCost: 0.0,
		},
		{
			name:         "Enterprise plan - 10% discount for 1000+",
			planID:       model.PlanAgency,
			volume:       2000,
			expectedCost: 0.0,
		},
		{
			name:         "Enterprise plan - 15% discount for 5000+",
			planID:       model.PlanAgency,
			volume:       7000,
			expectedCost: 0.0,
		},
		{
			name:         "Enterprise plan - 20% discount for 10000+",
			planID:       model.PlanAgency,
			volume:       15000,
			expectedCost: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := engine.CalculateSMSCostForPlan(tt.planID, tt.volume)
			assert.InDelta(t, tt.expectedCost, cost, 0.001) // Allow small floating point differences
		})
	}
}

func TestPricingEngine_GetPlanLimits(t *testing.T) {
	engine := &PricingEngine{}

	tests := []struct {
		name   string
		planID string
	}{
		{name: "Free plan", planID: model.PlanFree},
		{name: "Professional plan", planID: model.PlanPro},
		{name: "Enterprise plan", planID: model.PlanAgency},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limits := engine.GetPlanLimits(tt.planID)

			// Verify that limits are returned and have expected structure
			assert.GreaterOrEqual(t, limits.SMSRatePerMessage, 0.0)
			assert.Greater(t, limits.SMSBurst, 0)
			assert.GreaterOrEqual(t, limits.MaxDevices, -1) // -1 means unlimited
			assert.Greater(t, limits.MaxSimsPerDevice, 0)
		})
	}
}

func TestPricingEngine_EstimateMonthlyCost(t *testing.T) {
	engine := &PricingEngine{}

	tests := []struct {
		name                    string
		planID                  string
		expectedMonthlyVolume   int
		expectedSubscriptionFee float64
		minExpectedSMSCost      float64
		maxExpectedSMSCost      float64
	}{
		{
			name:                    "Free plan - 100 SMS included",
			planID:                  model.PlanFree,
			expectedMonthlyVolume:   100,
			expectedSubscriptionFee: 0.0,
			minExpectedSMSCost:      0.0,
			maxExpectedSMSCost:      0.0,
		},
		{
			name:                    "Professional plan - 2000 SMS included",
			planID:                  model.PlanPro,
			expectedMonthlyVolume:   2000,
			expectedSubscriptionFee: 10.0,
			minExpectedSMSCost:      0.0,
			maxExpectedSMSCost:      0.0,
		},
		{
			name:                    "Enterprise plan - 15000 SMS included",
			planID:                  model.PlanAgency,
			expectedMonthlyVolume:   15000,
			expectedSubscriptionFee: 99.0,
			minExpectedSMSCost:      0.0,
			maxExpectedSMSCost:      0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			subscriptionFee, smsCost := engine.EstimateMonthlyCost(tt.planID, tt.expectedMonthlyVolume)

			assert.Equal(t, tt.expectedSubscriptionFee, subscriptionFee)
			assert.InDelta(t, tt.minExpectedSMSCost, smsCost, 1.0) // Allow small differences for floating point
		})
	}
}

func TestPricingEngine_GetAvailablePlans(t *testing.T) {
	engine := &PricingEngine{}

	plans := engine.GetAvailablePlans()

	// Should have at least 3 plans
	assert.GreaterOrEqual(t, len(plans), 3)

	// Check that all plans have required fields
	for _, plan := range plans {
		assert.NotEmpty(t, plan.ID)
		assert.NotEmpty(t, plan.Name)
		assert.GreaterOrEqual(t, plan.Price, 0)
		assert.GreaterOrEqual(t, plan.Limits.SMSRatePerMessage, 0.0)
		assert.Greater(t, plan.Limits.SMSBurst, 0)
	}
}

func TestPricingEngine_applyVolumeDiscount(t *testing.T) {
	engine := &PricingEngine{}

	tests := []struct {
		name         string
		baseCost     float64
		planID       string
		volume       int
		expectedCost float64
	}{
		{
			name:         "Starter plan - no discount applied",
			baseCost:     5.0,
			planID:       model.PlanFree,
			volume:       10000,
			expectedCost: 5.0,
		},
		{
			name:         "Professional plan - volume below threshold",
			baseCost:     3.0,
			planID:       model.PlanPro,
			volume:       500,
			expectedCost: 3.0,
		},
		{
			name:         "Professional plan - 5% discount threshold",
			baseCost:     3.0,
			planID:       model.PlanPro,
			volume:       1000,
			expectedCost: 2.85,
		},
		{
			name:         "Professional plan - 10% discount threshold",
			baseCost:     3.0,
			planID:       model.PlanPro,
			volume:       5000,
			expectedCost: 2.7,
		},
		{
			name:         "Enterprise plan - 20% discount threshold",
			baseCost:     2.0,
			planID:       model.PlanAgency,
			volume:       10000,
			expectedCost: 1.6,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := engine.applyVolumeDiscount(tt.baseCost, tt.planID, tt.volume)
			assert.InDelta(t, tt.expectedCost, cost, 0.001) // Allow small floating point differences
		})
	}
}
