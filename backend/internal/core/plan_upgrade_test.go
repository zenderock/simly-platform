package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/zenderock/simly-backend/internal/model"
)

func TestProperty_PlanUpgradeVerifier(t *testing.T) {
	engine := &PricingEngine{}

	t.Run("Property 8: Plan upgrade immediately applies new rates", func(t *testing.T) {
		// Verify that current plan pricing is reflected immediately.
		// SMS are currently included at a zero unit cost across built-in plans.

		freeCost := engine.CalculateSMSCostForPlan(model.PlanFree, 1)
		proCost := engine.CalculateSMSCostForPlan(model.PlanPro, 1)
		enterpriseCost := engine.CalculateSMSCostForPlan(model.PlanAgency, 1)

		assert.Equal(t, 0.0, freeCost, "Free plan should currently include SMS")
		assert.Equal(t, 0.0, proCost, "Professional plan should currently include SMS")
		assert.Equal(t, 0.0, enterpriseCost, "Enterprise plan should currently include SMS")

		freeLimits := model.GetPlanLimits(model.PlanFree)
		proLimits := model.GetPlanLimits(model.PlanPro)
		enterpriseLimits := model.GetPlanLimits(model.PlanAgency)

		assert.Greater(t, proLimits.SMSBurst, freeLimits.SMSBurst, "Upgrade to Professional should increase burst capacity")
		assert.Greater(t, enterpriseLimits.SMSBurst, proLimits.SMSBurst, "Upgrade to Enterprise should further increase burst capacity")
	})

	t.Run("Property 9: Plan-based limit updates are correct", func(t *testing.T) {
		// Verify limits for each plan
		freeLimits := model.GetPlanLimits(model.PlanFree)
		proLimits := model.GetPlanLimits(model.PlanPro)
		enterpriseLimits := model.GetPlanLimits(model.PlanAgency)

		// Check Applications
		assert.Equal(t, 1, freeLimits.MaxApplications)
		assert.Equal(t, 5, proLimits.MaxApplications)
		assert.Equal(t, -1, enterpriseLimits.MaxApplications, "Enterprise should have unlimited applications")

		// Check Contacts
		assert.Equal(t, 100, freeLimits.MaxContacts)
		assert.Equal(t, 1000, proLimits.MaxContacts)
		assert.Equal(t, -1, enterpriseLimits.MaxContacts)

		// Verify logic transitions
		// Simulate logic that would occur in FeatureLimitManager
		checkLimit := func(limit, current int) bool {
			if limit == -1 {
				return true
			}
			return current < limit
		}

		// Scenario: User has 3 applications
		currentApps := 3

		// On Starter (Max 1), they should be blocked
		assert.False(t, checkLimit(freeLimits.MaxApplications, currentApps), "Free plan should block 3 apps")

		// Upgrade to Pro (Max 5), they should be allowed
		assert.True(t, checkLimit(proLimits.MaxApplications, currentApps), "Pro plan should allow 3 apps")

		// Scenario: User has 10000 contacts
		currentContacts := 10000

		// On Pro (Max 1000), blocked
		assert.False(t, checkLimit(proLimits.MaxContacts, currentContacts), "Pro plan should block 10k contacts")

		// Upgrade to Agency (Unlimited), allowed
		assert.True(t, checkLimit(enterpriseLimits.MaxContacts, currentContacts), "Enterprise plan should allow 10k contacts")
	})
}
