package core

import (
	"context"
	"errors"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

var ErrNoOrganization = errors.New("user has no organization")

type OrganizationService struct {
	store          *store.Store
	billingService *BillingService
}

func NewOrganizationService(store *store.Store, billingService *BillingService) *OrganizationService {
	return &OrganizationService{
		store:          store,
		billingService: billingService,
	}
}

func (s *OrganizationService) WithStore(store *store.Store) *OrganizationService {
	return &OrganizationService{
		store:          store,
		billingService: s.billingService,
	}
}

func (s *OrganizationService) CreateOrganization(ctx context.Context, userID int, name, slug string, role string) (*model.Organization, error) {
	limits := model.GetPlanLimits(model.PlanFree)
	org := &model.Organization{
		Name: name,
		Slug: slug,
		Plan: model.PlanFree,
		// Limits
		SMSMonthlyLimit:          0, // Initial limit for backward compatibility
		SMSBurstLimit:            limits.SMSBurst,
		MaxDevices:               limits.MaxDevices,
		MaxSimsPerDevice:         limits.MaxSimsPerDevice,
		MaxApplications:          limits.MaxApplications,
		MaxContacts:              limits.MaxContacts,
		MaxCampaigns:             limits.MaxCampaigns,
		MaxRecipientsPerCampaign: limits.MaxRecipientsPerCampaign,
		// Default Dispatch Settings
		SMSThrottleRateSeconds: 1,
		SendWindowStart:        9,
		SendWindowEnd:          21,
		SendWindowTimezone:     "UTC",
	}
	if err := s.store.CreateOrganization(ctx, org); err != nil {
		return nil, err
	}

	// Add Creator
	if err := s.AddMember(ctx, org.ID, userID, role); err != nil {
		// Ideally rollback, but for now just return error (orphan org risk)
		return nil, err
	}

	return org, nil
}

func (s *OrganizationService) AddMember(ctx context.Context, orgID, userID int, role string) error {
	member := &model.OrganizationMember{
		OrganizationID: orgID,
		UserID:         userID,
		Role:           role,
	}
	return s.store.AddOrganizationMember(ctx, member)
}

func (s *OrganizationService) GetMemberRole(ctx context.Context, orgID, userID int) (string, error) {
	return s.store.GetMemberRole(ctx, orgID, userID)
}

func (s *OrganizationService) GetUserOrganizations(ctx context.Context, userID int) ([]model.Organization, error) {
	return s.store.GetUserOrganizations(ctx, userID)
}

func (s *OrganizationService) RemoveMember(ctx context.Context, orgID, userID int) error {
	return s.store.RemoveOrganizationMember(ctx, orgID, userID)
}

func (s *OrganizationService) GetOrganizationByID(ctx context.Context, orgID int) (*model.Organization, error) {
	return s.store.GetOrganizationByID(ctx, orgID)
}

func (s *OrganizationService) UpdateOrganization(ctx context.Context, orgID int, name string) error {
	return s.store.UpdateOrganization(ctx, orgID, name)
}

func (s *OrganizationService) GetOrganizationStats(ctx context.Context, orgID int) (*model.OrganizationStats, error) {
	return s.store.GetOrganizationStats(ctx, orgID)
}

func (s *OrganizationService) UpdatePlan(ctx context.Context, orgID int, planID string) error {
	limits := model.GetPlanLimits(planID)
	plan := model.GetPlanByID(planID)

	// Update Stripe Subscription if applicable
	if s.billingService != nil && plan != nil && plan.StripePriceID != "" {
		if err := s.billingService.UpdateSubscription(ctx, orgID, plan.StripePriceID); err != nil {
			// Log error but proceed? Or fail?
			// Failing is safer to keep sync
			return fmt.Errorf("failed to update subscription in billing provider: %w", err)
		}
	}

	// Note: We keep SMSMonthlyLimit as 0 for backward compatibility during transition
	return s.store.UpdateOrganizationPlan(ctx, orgID, planID, 0, limits.SMSBurst, limits.MaxDevices, limits.MaxSimsPerDevice, limits.MaxApplications, limits.MaxContacts, limits.MaxCampaigns, limits.MaxRecipientsPerCampaign)
}

func (s *OrganizationService) GetDispatchSettings(ctx context.Context, orgID int) (*store.OrganizationDispatchSettings, error) {
	return s.store.GetOrganizationDispatchSettings(ctx, orgID)
}

func (s *OrganizationService) UpdateDispatchSettings(ctx context.Context, orgID int, settings *store.OrganizationDispatchSettings) error {
	return s.store.UpdateOrganizationDispatchSettings(ctx, orgID, settings)
}
