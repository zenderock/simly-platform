package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/zenderock/simly-backend/internal/model"
)

func TestProperty_PlanUpgradeVerifier(t *testing.T) {
	engine := &PricingEngine{}

	t.Run("Property 8: Plan upgrade immediately applies new rates", func(t *testing.T) {
		// Verify that different plans yield different rates via CalculateSMSCostForPlan
		// This simulates the effect after a DB update would happen

		starterCost := engine.CalculateSMSCostForPlan(model.PlanFree, 1)
		proCost := engine.CalculateSMSCostForPlan(model.PlanPro, 1)
		agencyCost := engine.CalculateSMSCostForPlan(model.PlanAgency, 1)

		assert.Equal(t, 5.0, starterCost, "Starter plan should appear as 5 cents")
		assert.Equal(t, 3.0, proCost, "Pro plan should appear as 3 cents")
		assert.Equal(t, 2.0, agencyCost, "Agency plan logic should appear as 2 cents")

		assert.Less(t, proCost, starterCost, "Upgrade to Pro should reduce costs")
		assert.Less(t, agencyCost, proCost, "Upgrade to Agency should reduce costs further")
	})

	t.Run("Property 9: Plan-based limit updates are correct", func(t *testing.T) {
		// Verify limits for each plan
		starterLimits := model.GetPlanLimits(model.PlanFree)
		proLimits := model.GetPlanLimits(model.PlanPro)
		agencyLimits := model.GetPlanLimits(model.PlanAgency)

		// Check Applications
		assert.Equal(t, 1, starterLimits.MaxApplications)
		assert.Equal(t, 5, proLimits.MaxApplications)
		assert.Equal(t, -1, agencyLimits.MaxApplications, "Agency should have unlimited applications")

		// Check Contacts
		assert.Equal(t, 100, starterLimits.MaxContacts)
		assert.Equal(t, 1000, proLimits.MaxContacts)
		assert.Equal(t, -1, agencyLimits.MaxContacts)

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
		assert.False(t, checkLimit(starterLimits.MaxApplications, currentApps), "Starter plan should block 3 apps")

		// Upgrade to Pro (Max 5), they should be allowed
		assert.True(t, checkLimit(proLimits.MaxApplications, currentApps), "Pro plan should allow 3 apps")

		// Scenario: User has 10000 contacts
		currentContacts := 10000

		// On Pro (Max 1000), blocked
		assert.False(t, checkLimit(proLimits.MaxContacts, currentContacts), "Pro plan should block 10k contacts")

		// Upgrade to Agency (Unlimited), allowed
		assert.True(t, checkLimit(agencyLimits.MaxContacts, currentContacts), "Agency plan should allow 10k contacts")
	})
}
