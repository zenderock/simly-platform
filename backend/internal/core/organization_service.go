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

func (s *OrganizationService) CreateOrganization(ctx context.Context, name, slug string) (*model.Organization, error) {
	org := &model.Organization{
		Name: name,
		Slug: slug,
		Plan: "free",
	}
	if err := s.store.CreateOrganization(ctx, org); err != nil {
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

func (s *OrganizationService) GetUserOrganizations(ctx context.Context, userID int) ([]model.Organization, error) {
	return s.store.GetUserOrganizations(ctx, userID)
}
