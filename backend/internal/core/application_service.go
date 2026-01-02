package core

import (
	"context"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type ApplicationService struct {
	store         *store.Store
	featureLimits *FeatureLimitManager
}

func NewApplicationService(store *store.Store, featureLimits *FeatureLimitManager) *ApplicationService {
	return &ApplicationService{
		store:         store,
		featureLimits: featureLimits,
	}
}

func (s *ApplicationService) WithStore(store *store.Store) *ApplicationService {
	return &ApplicationService{
		store:         store,
		featureLimits: s.featureLimits.WithStore(store),
	}
}

func (s *ApplicationService) CreateApplication(ctx context.Context, orgID int, name string, isSandbox bool) (*model.Application, error) {
	// Check feature limits
	if err := s.featureLimits.ValidateApplicationCreation(ctx, orgID); err != nil {
		return nil, err
	}

	app := &model.Application{
		OrganizationID: orgID,
		Name:           name,
		IsSandbox:      isSandbox,
	}
	if err := s.store.CreateApplication(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

func (s *ApplicationService) ListApplications(ctx context.Context, orgID int) ([]model.Application, error) {
	return s.store.GetApplicationsByOrganizationID(ctx, orgID)
}

func (s *ApplicationService) GetApplication(ctx context.Context, appID int) (*model.Application, error) {
	return s.store.GetApplicationByID(ctx, appID)
}

func (s *ApplicationService) UpdateApplication(ctx context.Context, appID, orgID int, name string) (*model.Application, error) {
	if err := s.store.UpdateApplication(ctx, appID, orgID, name); err != nil {
		return nil, err
	}
	return s.store.GetApplicationByID(ctx, appID)
}

func (s *ApplicationService) DeleteApplication(ctx context.Context, appID, orgID int) error {
	return s.store.DeleteApplication(ctx, appID, orgID)
}
