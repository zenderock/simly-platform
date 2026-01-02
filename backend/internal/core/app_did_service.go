package core

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type AppDIDService struct {
	store *store.Store
}

func NewAppDIDService(store *store.Store) *AppDIDService {
	return &AppDIDService{store: store}
}

// CreateAppDID creates a new DID assignment for an application
func (s *AppDIDService) CreateAppDID(ctx context.Context, orgID int, req model.CreateAppDIDRequest) (*model.AppDID, error) {
	// Validate DID number format
	if err := s.validateDIDNumber(req.DIDNumber); err != nil {
		return nil, err
	}

	// Verify application belongs to organization
	app, err := s.store.GetApplicationByID(ctx, req.ApplicationID)
	if err != nil {
		return nil, fmt.Errorf("application not found: %w", err)
	}
	if app.OrganizationID != orgID {
		return nil, errors.New("unauthorized: application does not belong to your organization")
	}

	// Check if DID number is already assigned
	existing, err := s.store.GetAppDIDByNumber(ctx, req.DIDNumber)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("DID number %s is already assigned to another application", req.DIDNumber)
	}

	appDID := &model.AppDID{
		ApplicationID: req.ApplicationID,
		DIDNumber:     s.normalizeDIDNumber(req.DIDNumber),
		Description:   req.Description,
		IsActive:      true,
	}

	if err := s.store.CreateAppDID(ctx, appDID); err != nil {
		return nil, err
	}

	return appDID, nil
}

// GetAppDID retrieves a DID assignment by ID
func (s *AppDIDService) GetAppDID(ctx context.Context, id int, orgID int) (*model.AppDID, error) {
	appDID, err := s.store.GetAppDIDByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verify ownership through application
	app, err := s.store.GetApplicationByID(ctx, appDID.ApplicationID)
	if err != nil {
		return nil, err
	}
	if app.OrganizationID != orgID {
		return nil, errors.New("unauthorized: DID does not belong to your organization")
	}

	return appDID, nil
}

// ListAppDIDsByApplication retrieves all DID assignments for an application
func (s *AppDIDService) ListAppDIDsByApplication(ctx context.Context, applicationID int, orgID int) ([]model.AppDID, error) {
	// Verify application belongs to organization
	app, err := s.store.GetApplicationByID(ctx, applicationID)
	if err != nil {
		return nil, fmt.Errorf("application not found: %w", err)
	}
	if app.OrganizationID != orgID {
		return nil, errors.New("unauthorized: application does not belong to your organization")
	}

	return s.store.ListAppDIDsByApplicationID(ctx, applicationID)
}

// ListAppDIDsByOrganization retrieves all DID assignments for an organization
func (s *AppDIDService) ListAppDIDsByOrganization(ctx context.Context, orgID int) ([]model.AppDID, error) {
	return s.store.ListAppDIDsByOrganizationID(ctx, orgID)
}

// UpdateAppDID updates a DID assignment
func (s *AppDIDService) UpdateAppDID(ctx context.Context, id int, orgID int, req model.UpdateAppDIDRequest) error {
	// Verify ownership
	_, err := s.GetAppDID(ctx, id, orgID)
	if err != nil {
		return err
	}

	return s.store.UpdateAppDID(ctx, id, &req)
}

// DeleteAppDID deletes a DID assignment
func (s *AppDIDService) DeleteAppDID(ctx context.Context, id int, orgID int) error {
	return s.store.DeleteAppDID(ctx, id, orgID)
}

// ResolveApplicationFromDID resolves which application should receive an incoming SMS
// based on the destination DID number
func (s *AppDIDService) ResolveApplicationFromDID(ctx context.Context, didNumber string) (*int, error) {
	normalizedNumber := s.normalizeDIDNumber(didNumber)

	appDID, err := s.store.GetAppDIDByNumber(ctx, normalizedNumber)
	if err != nil {
		// No DID mapping found - this is not an error, just means no specific app assignment
		return nil, nil
	}

	return &appDID.ApplicationID, nil
}

// validateDIDNumber validates the format of a DID number
func (s *AppDIDService) validateDIDNumber(didNumber string) error {
	if didNumber == "" {
		return errors.New("DID number cannot be empty")
	}

	// Remove all non-digit characters for validation
	cleaned := regexp.MustCompile(`[^\d]`).ReplaceAllString(didNumber, "")

	if len(cleaned) < 7 || len(cleaned) > 15 {
		return errors.New("DID number must be between 7 and 15 digits")
	}

	return nil
}

// normalizeDIDNumber normalizes a DID number to a consistent format
func (s *AppDIDService) normalizeDIDNumber(didNumber string) string {
	// Remove all non-digit characters
	cleaned := regexp.MustCompile(`[^\d]`).ReplaceAllString(didNumber, "")

	// Add + prefix if not present
	if !strings.HasPrefix(cleaned, "+") {
		cleaned = "+" + cleaned
	}

	return cleaned
}
