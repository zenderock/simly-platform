package core

import (
	"context"

	"github.com/zenderock/simly-backend/internal/store"
)

type DashboardService struct {
	store *store.Store
}

func NewDashboardService(store *store.Store) *DashboardService {
	return &DashboardService{store: store}
}

func (s *DashboardService) GetStats(ctx context.Context, orgID int64, appID *int) (*store.DashboardStats, error) {
	return s.store.GetDashboardStats(ctx, orgID, appID)
}

func (s *DashboardService) GetTrafficStats(ctx context.Context, orgID int64, days int, appID *int) ([]store.TrafficStat, error) {
	return s.store.GetMessageTrafficStats(ctx, orgID, days, appID)
}
