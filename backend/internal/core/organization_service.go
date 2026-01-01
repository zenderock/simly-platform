package core

import (
	"context"
	"errors"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

var ErrNoOrganization = errors.New("user has no organization")

type OrganizationService struct {
	store *store.Store
}

func NewOrganizationService(store *store.Store) *OrganizationService {
	return &OrganizationService{store: store}
}

func (s *OrganizationService) WithStore(store *store.Store) *OrganizationService {
	return &OrganizationService{store: store}
}

func (s *OrganizationService) CreateOrganization(ctx context.Context, userID int, name, slug string, role string) (*model.Organization, error) {
	org := &model.Organization{
		Name: name,
		Slug: slug,
		Plan: "starter",
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
	return s.store.UpdateOrganizationPlan(ctx, orgID, planID, limits.SMSMonthly, limits.SMSBurst, limits.MaxDevices, limits.MaxSimsPerDevice)
}
