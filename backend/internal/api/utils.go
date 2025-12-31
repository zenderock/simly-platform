package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/zenderock/simly-backend/internal/core"
)

// GetActiveOrgID resolves the organization ID from the request context.
// Priority:
// 1. X-Organization-ID Header (Strict check: User must be member)
// 2. Default: User's first available organization (MVP Fallback)
func GetActiveOrgID(r *http.Request, orgService *core.OrganizationService) (int, error) {
	// 1. Check Header
	orgIDStr := r.Header.Get("X-Organization-ID")
	if orgIDStr != "" {
		orgID, err := strconv.Atoi(orgIDStr)
		if err != nil {
			return 0, errors.New("invalid organization ID header")
		}

		// Verify membership
		userID := GetUserID(r.Context())
		if _, err := orgService.GetMemberRole(r.Context(), orgID, userID); err != nil {
			// If error (including not found), deny access
			return 0, core.ErrNoOrganization
		}
		return orgID, nil
	}

	// 2. Fallback (MVP behavior)
	userID := GetUserID(r.Context())
	orgs, err := orgService.GetUserOrganizations(r.Context(), userID)
	if err != nil || len(orgs) == 0 {
		return 0, core.ErrNoOrganization
	}
	return orgs[0].ID, nil
}
