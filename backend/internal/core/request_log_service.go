package core

import (
	"context"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// RequestLogService handles request logging operations
type RequestLogService struct {
	store *store.Store
}

// NewRequestLogService creates a new RequestLogService instance
func NewRequestLogService(store *store.Store) *RequestLogService {
	return &RequestLogService{
		store: store,
	}
}

// CreateLog creates a new request log entry
func (s *RequestLogService) CreateLog(ctx context.Context, log *model.RequestLog) error {
	return s.store.CreateRequestLog(ctx, log)
}

// ListLogs retrieves request logs for an organization with optional filters
func (s *RequestLogService) ListLogs(ctx context.Context, orgID int, filters model.RequestLogFilters) ([]model.RequestLog, error) {
	return s.store.GetRequestLogsByOrganizationID(ctx, orgID, filters)
}

// GetLog retrieves a single request log by ID
func (s *RequestLogService) GetLog(ctx context.Context, logID, orgID int) (*model.RequestLog, error) {
	return s.store.GetRequestLogByID(ctx, logID, orgID)
}
