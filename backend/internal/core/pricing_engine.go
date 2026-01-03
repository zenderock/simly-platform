package core

import (
	"context"
	"fmt"
	"math"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// PricingEngine handles cost calculations and plan-based feature limit validation
type PricingEngine struct {
	store *store.Store
}

// NewPricingEngine creates a new pricing engine instance
func NewPricingEngine(store *store.Store) *PricingEngine {
	return &PricingEngine{
		store: store,
	}
}

// WithStore creates a copy of the pricing engine with a new store (for transactions)
func (p *PricingEngine) WithStore(store *store.Store) *PricingEngine {
	return &PricingEngine{
		store: store,
	}
}

// CalculateSMSCost calculates the cost of an SMS based on the organization's plan
// Includes volume discount calculations for higher tiers
func (p *PricingEngine) CalculateSMSCost(ctx context.Context, orgID int, volume int) (float64, error) {
	org, err := p.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return 0, fmt.Errorf("failed to get organization: %w", err)
	}

	limits := model.GetPlanLimits(org.Plan)
	baseCost := limits.SMSRatePerMessage

	// Apply volume discounts for higher tiers
	discountedCost := p.applyVolumeDiscount(baseCost, org.Plan, volume)

	return discountedCost, nil
}

// CalculateSMSCostForPlan calculates SMS cost for a specific plan without requiring organization lookup
func (p *PricingEngine) CalculateSMSCostForPlan(planID string, volume int) float64 {
	limits := model.GetPlanLimits(planID)
	baseCost := limits.SMSRatePerMessage

	return p.applyVolumeDiscount(baseCost, planID, volume)
}

// applyVolumeDiscount applies volume-based discounts for higher tier plans
func (p *PricingEngine) applyVolumeDiscount(baseCost float64, planID string, volume int) float64 {
	// Volume discounts only apply to Professional and Enterprise plans
	switch planID {
	case model.PlanPro:
		// Professional: 5% discount for 1000+ SMS, 10% for 5000+
		if volume >= 5000 {
			return baseCost * 0.90 // 10% discount
		} else if volume >= 1000 {
			return baseCost * 0.95 // 5% discount
		}
	case model.PlanAgency:
		// Enterprise: 10% discount for 1000+ SMS, 15% for 5000+, 20% for 10000+
		if volume >= 10000 {
			return baseCost * 0.80 // 20% discount
		} else if volume >= 5000 {
			return baseCost * 0.85 // 15% discount
		} else if volume >= 1000 {
			return baseCost * 0.90 // 10% discount
		}
	}

	// No discount for Starter plan or volumes below threshold
	return baseCost
}

// CheckFeatureLimit validates if an organization can create more of a specific feature type
func (p *PricingEngine) CheckFeatureLimit(ctx context.Context, orgID int, featureType string, currentCount int) error {
	org, err := p.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	var limit int
	switch featureType {
	case "application":
		limit = org.MaxApplications
	case "contact":
		limit = org.MaxContacts
	case "campaign":
		limit = org.MaxCampaigns
	case "recipients_per_campaign":
		limit = org.MaxRecipientsPerCampaign
	default:
		return fmt.Errorf("unknown feature type: %s", featureType)
	}

	// -1 means unlimited
	if limit == -1 {
		return nil
	}

	if currentCount >= limit {
		return fmt.Errorf("%w: %s limit exceeded (max: %d, current: %d)", ErrLimitExceeded, featureType, limit, currentCount)
	}

	return nil
}

// GetPlanLimits returns the feature limits for a given plan ID
func (p *PricingEngine) GetPlanLimits(planID string) model.PlanLimits {
	return model.GetPlanLimits(planID)
}

// ValidateFeatureLimitIncrease checks if adding a certain number of items would exceed limits
func (p *PricingEngine) ValidateFeatureLimitIncrease(ctx context.Context, orgID int, featureType string, currentCount, increaseBy int) error {
	return p.CheckFeatureLimit(ctx, orgID, featureType, currentCount+increaseBy)
}

// CalculateBulkSMSCost calculates the total cost for a bulk SMS operation with volume discounts
func (p *PricingEngine) CalculateBulkSMSCost(ctx context.Context, orgID int, messageCount int) (float64, error) {
	if messageCount <= 0 {
		return 0, nil
	}

	costPerSMS, err := p.CalculateSMSCost(ctx, orgID, messageCount)
	if err != nil {
		return 0, err
	}

	totalCost := float64(messageCount) * costPerSMS
	return math.Round(totalCost*100) / 100, nil // Round to 2 decimal places
}

// GetAvailablePlans returns all available plans with their current pricing
func (p *PricingEngine) GetAvailablePlans() []model.Plan {
	return model.AvailablePlans
}

// EstimateMonthlyCost estimates monthly cost based on expected SMS volume
func (p *PricingEngine) EstimateMonthlyCost(planID string, expectedMonthlyVolume int) (float64, float64) {
	plan := model.GetPlanByID(planID)
	if plan == nil {
		return 0, 0
	}

	// Calculate SMS costs with volume discounts
	smsUnitCost := p.CalculateSMSCostForPlan(planID, expectedMonthlyVolume)
	totalSMSCost := float64(expectedMonthlyVolume) * smsUnitCost

	// Add monthly subscription fee
	subscriptionFee := float64(plan.Price) / 100 // Convert cents to dollars

	return subscriptionFee, totalSMSCost
}

// UpdateOrganizationLimits updates an organization's feature limits based on new plan
func (p *PricingEngine) UpdateOrganizationLimits(ctx context.Context, orgID int, newPlanID string) error {
	limits := model.GetPlanLimits(newPlanID)

	return p.store.UpdateOrganizationPlan(
		ctx,
		orgID,
		newPlanID,
		0, // SMSMonthlyLimit set to 0 for pay-per-use
		limits.SMSBurst,
		limits.MaxDevices,
		limits.MaxSimsPerDevice,
		limits.MaxApplications,
		limits.MaxContacts,
		limits.MaxCampaigns,
		limits.MaxRecipientsPerCampaign,
	)
}
