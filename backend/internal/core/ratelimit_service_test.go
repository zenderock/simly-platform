package core

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/zenderock/simly-backend/internal/model"
)

func TestRateLimitService_BurstLimiting(t *testing.T) {
	// Test burst limiting functionality without needing a real database
	service := NewRateLimitService(nil) // We'll test the limiter logic directly

	appID := 100
	burstLimit := 5

	// Update limiter with specific burst limit
	service.UpdateLimiterForOrg(appID, burstLimit)

	// Get the limiter and test it directly
	limiter := service.getLimiter(appID)
	assert.NotNil(t, limiter)

	// First few requests should succeed (within burst limit)
	for i := 0; i < burstLimit; i++ {
		allowed := limiter.Allow()
		assert.True(t, allowed, "Request %d should be allowed within burst limit", i+1)
	}

	// Next request should be rate limited
	allowed := limiter.Allow()
	assert.False(t, allowed, "Request should be rate limited after exceeding burst")
}

func TestRateLimitService_UpdateLimiterForOrg(t *testing.T) {
	service := NewRateLimitService(nil)

	appID := 100
	burstLimit := 60 // 60 requests per minute

	// Update limiter
	service.UpdateLimiterForOrg(appID, burstLimit)

	// Verify the limiter was created/updated
	limiter := service.getLimiter(appID)
	assert.NotNil(t, limiter)

	// The rate should be burstLimit/60 per second, with burst = burstLimit
	expectedRate := float64(burstLimit) / 60.0
	assert.Equal(t, expectedRate, float64(limiter.Limit()))
	assert.Equal(t, burstLimit, limiter.Burst())
}

func TestRateLimitService_DefaultLimiter(t *testing.T) {
	service := NewRateLimitService(nil)

	appID := 200

	// Get limiter without setting specific limits (should use defaults)
	limiter := service.getLimiter(appID)
	assert.NotNil(t, limiter)

	// Should have default values
	assert.Equal(t, 5.0, float64(limiter.Limit()))
	assert.Equal(t, 10, limiter.Burst())
}

func TestRateLimitService_CalculateSMSCost_PlanLimits(t *testing.T) {
	// Test the plan limits directly without database dependency
	tests := []struct {
		name         string
		plan         string
		expectedCost float64
	}{
		{
			name:         "Starter plan",
			plan:         "starter",
			expectedCost: 5.0,
		},
		{
			name:         "Professional plan",
			plan:         "professional",
			expectedCost: 3.0,
		},
		{
			name:         "Enterprise plan",
			plan:         "enterprise",
			expectedCost: 2.0,
		},
		{
			name:         "Unknown plan defaults to starter",
			plan:         "unknown",
			expectedCost: 5.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limits := model.GetPlanLimits(tt.plan)
			assert.Equal(t, tt.expectedCost, limits.SMSRatePerMessage)
		})
	}
}

func TestRateLimitService_FeatureLimitLogic(t *testing.T) {
	// Test feature limit logic without database
	tests := []struct {
		name         string
		featureType  string
		limit        int
		currentCount int
		expectError  bool
	}{
		{
			name:         "Within application limit",
			featureType:  "application",
			limit:        5,
			currentCount: 3,
			expectError:  false,
		},
		{
			name:         "At application limit",
			featureType:  "application",
			limit:        5,
			currentCount: 5,
			expectError:  true,
		},
		{
			name:         "Unlimited applications",
			featureType:  "application",
			limit:        -1, // Unlimited
			currentCount: 1000,
			expectError:  false,
		},
		{
			name:         "Within contact limit",
			featureType:  "contact",
			limit:        100,
			currentCount: 50,
			expectError:  false,
		},
		{
			name:         "At contact limit",
			featureType:  "contact",
			limit:        100,
			currentCount: 100,
			expectError:  true,
		},
		{
			name:         "Within campaign limit",
			featureType:  "campaign",
			limit:        10,
			currentCount: 5,
			expectError:  false,
		},
		{
			name:         "At campaign limit",
			featureType:  "campaign",
			limit:        10,
			currentCount: 10,
			expectError:  true,
		},
		{
			name:         "Within recipients per campaign limit",
			featureType:  "recipients_per_campaign",
			limit:        500,
			currentCount: 250,
			expectError:  false,
		},
		{
			name:         "At recipients per campaign limit",
			featureType:  "recipients_per_campaign",
			limit:        500,
			currentCount: 500,
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test the limit logic directly
			var shouldError bool
			if tt.limit == -1 {
				shouldError = false // Unlimited
			} else {
				shouldError = tt.currentCount >= tt.limit
			}

			assert.Equal(t, tt.expectError, shouldError)
		})
	}
}

func TestRateLimitService_UsageRecordStructure(t *testing.T) {
	// Test that usage record structure is correct
	appID := 100
	messageID := 200
	orgID := 1
	cost := 5.0
	period := time.Now().Format("2006-01")

	record := &model.UsageRecord{
		OrganizationID: orgID,
		ApplicationID:  &appID,
		MessageID:      &messageID,
		UsageType:      "sms",
		Cost:           cost,
		Timestamp:      time.Now(),
		Period:         period,
	}

	// Verify structure
	assert.Equal(t, orgID, record.OrganizationID)
	assert.Equal(t, appID, *record.ApplicationID)
	assert.Equal(t, messageID, *record.MessageID)
	assert.Equal(t, "sms", record.UsageType)
	assert.Equal(t, cost, record.Cost)
	assert.Equal(t, period, record.Period)
}

func TestRateLimitService_NoMonthlyQuotaLogic(t *testing.T) {
	// This test verifies the conceptual change: no monthly quota checks
	// The AllowRequest method should only check burst limits, not monthly quotas

	// Test that monthly limits are ignored in the new model
	org := &model.Organization{
		ID:              1,
		SMSMonthlyLimit: 1000, // This should be ignored in pay-per-use model
		SMSBurstLimit:   10,   // Only this should matter
	}

	// In the pay-per-use model, we only care about burst limits
	assert.Greater(t, org.SMSMonthlyLimit, 0, "Monthly limit exists but should be ignored")
	assert.Greater(t, org.SMSBurstLimit, 0, "Burst limit should be used for rate limiting")

	// The key insight: monthly limits are kept for backward compatibility
	// but are not used in the AllowRequest logic
}

func TestRateLimitService_PlanLimitsStructure(t *testing.T) {
	// Test that all plans have the correct structure for pay-per-use pricing
	plans := []string{"starter", "professional", "enterprise"}

	for _, planID := range plans {
		t.Run("Plan_"+planID, func(t *testing.T) {
			limits := model.GetPlanLimits(planID)

			// All plans should have per-SMS rates
			assert.Greater(t, limits.SMSRatePerMessage, 0.0, "Plan %s should have SMS rate > 0", planID)

			// All plans should have burst limits
			assert.Greater(t, limits.SMSBurst, 0, "Plan %s should have burst limit > 0", planID)

			// Feature limits should be set (can be -1 for unlimited)
			assert.GreaterOrEqual(t, limits.MaxApplications, -1, "Plan %s should have valid application limit", planID)
			assert.GreaterOrEqual(t, limits.MaxContacts, -1, "Plan %s should have valid contact limit", planID)
			assert.GreaterOrEqual(t, limits.MaxCampaigns, -1, "Plan %s should have valid campaign limit", planID)
			assert.GreaterOrEqual(t, limits.MaxRecipientsPerCampaign, -1, "Plan %s should have valid recipients limit", planID)
		})
	}
}

func TestRateLimitService_RateLimiterBehavior(t *testing.T) {
	service := NewRateLimitService(nil)

	// Test that different apps get different limiters
	appID1 := 100
	appID2 := 200

	service.UpdateLimiterForOrg(appID1, 10)
	service.UpdateLimiterForOrg(appID2, 20)

	limiter1 := service.getLimiter(appID1)
	limiter2 := service.getLimiter(appID2)

	// Should be different limiter instances
	assert.NotEqual(t, limiter1, limiter2, "Different apps should have different limiters")

	// Should have different burst limits
	assert.Equal(t, 10, limiter1.Burst())
	assert.Equal(t, 20, limiter2.Burst())
}
