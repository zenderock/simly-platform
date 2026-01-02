package core

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/store"
)

// FeatureLimitManager enforces plan-based limits on organizational features
type FeatureLimitManager struct {
	store         *store.Store
	pricingEngine *PricingEngine
}

// NewFeatureLimitManager creates a new feature limit manager instance
func NewFeatureLimitManager(store *store.Store) *FeatureLimitManager {
	return &FeatureLimitManager{
		store:         store,
		pricingEngine: NewPricingEngine(store),
	}
}

// WithStore creates a copy of the manager with a new store (for transactions)
func (f *FeatureLimitManager) WithStore(store *store.Store) *FeatureLimitManager {
	return &FeatureLimitManager{
		store:         store,
		pricingEngine: f.pricingEngine.WithStore(store),
	}
}

// ValidateApplicationCreation checks if an organization can create a new application
func (f *FeatureLimitManager) ValidateApplicationCreation(ctx context.Context, orgID int) error {
	currentCount, err := f.store.CountApplicationsByOrganization(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to count applications: %w", err)
	}

	return f.pricingEngine.CheckFeatureLimit(ctx, orgID, "application", currentCount)
}

// ValidateContactCreation checks if an organization can add new contacts
func (f *FeatureLimitManager) ValidateContactCreation(ctx context.Context, orgID int, contactsToAdd int) error {
	currentCount, err := f.store.CountContactsByOrganization(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to count contacts: %w", err)
	}

	return f.pricingEngine.ValidateFeatureLimitIncrease(ctx, orgID, "contact", currentCount, contactsToAdd)
}

// ValidateCampaignCreation checks if an organization can create a new campaign
func (f *FeatureLimitManager) ValidateCampaignCreation(ctx context.Context, orgID int) error {
	currentCount, err := f.store.CountCampaignsByOrganization(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to count campaigns: %w", err)
	}

	return f.pricingEngine.CheckFeatureLimit(ctx, orgID, "campaign", currentCount)
}

// ValidateCampaignRecipients checks if a campaign can have the specified number of recipients
func (f *FeatureLimitManager) ValidateCampaignRecipients(ctx context.Context, orgID int, recipientCount int) error {
	return f.pricingEngine.CheckFeatureLimit(ctx, orgID, "recipients_per_campaign", recipientCount)
}

// GetCurrentUsage returns current usage counts for all feature types
func (f *FeatureLimitManager) GetCurrentUsage(ctx context.Context, orgID int) (map[string]int, error) {
	usage := make(map[string]int)

	applicationCount, err := f.store.CountApplicationsByOrganization(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to count applications: %w", err)
	}
	usage["applications"] = applicationCount

	contactCount, err := f.store.CountContactsByOrganization(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to count contacts: %w", err)
	}
	usage["contacts"] = contactCount

	campaignCount, err := f.store.CountCampaignsByOrganization(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to count campaigns: %w", err)
	}
	usage["campaigns"] = campaignCount

	return usage, nil
}

// GetFeatureLimits returns the current feature limits for an organization
func (f *FeatureLimitManager) GetFeatureLimits(ctx context.Context, orgID int) (map[string]int, error) {
	org, err := f.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	limits := map[string]int{
		"applications":            org.MaxApplications,
		"contacts":                org.MaxContacts,
		"campaigns":               org.MaxCampaigns,
		"recipients_per_campaign": org.MaxRecipientsPerCampaign,
	}

	return limits, nil
}

// CheckAllLimits performs a comprehensive check of all feature limits
func (f *FeatureLimitManager) CheckAllLimits(ctx context.Context, orgID int) (map[string]bool, error) {
	usage, err := f.GetCurrentUsage(ctx, orgID)
	if err != nil {
		return nil, err
	}

	limits, err := f.GetFeatureLimits(ctx, orgID)
	if err != nil {
		return nil, err
	}

	status := make(map[string]bool)

	for feature, currentCount := range usage {
		limit := limits[feature]
		// -1 means unlimited
		if limit == -1 {
			status[feature] = true
		} else {
			status[feature] = currentCount < limit
		}
	}

	return status, nil
}
