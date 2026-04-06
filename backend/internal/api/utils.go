package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/zenderock/simly-backend/internal/core"
)

// RespondWithError sends a JSON error response
func RespondWithError(w http.ResponseWriter, code int, message string) {
	RespondWithJSON(w, code, map[string]string{"message": message})
}

// RespondWithJSON sends a JSON response
func RespondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

// GetActiveOrgID resolves the organization ID from the request context.
// Priority:
// 1. X-Organization-ID Header (Strict check: User must be member)
// 2. Default: User's first available organization (MVP Fallback)
func GetActiveOrgID(r *http.Request, orgService *core.OrganizationService) (int, error) {
	// 0. API Key context — already fully resolved by AuthMiddleware, trust it
	if id, ok := r.Context().Value(orgIDKey).(int); ok {
		return id, nil
	}

	userID := GetUserID(r.Context())
	if userID == 0 {
		// No authenticated user in context — token invalid or missing
		return 0, core.ErrNoOrganization
	}

	// 1. X-Organization-ID header — verify membership with a short timeout
	orgIDStr := r.Header.Get("X-Organization-ID")
	if orgIDStr != "" {
		orgID, err := strconv.Atoi(orgIDStr)
		if err != nil {
			return 0, errors.New("invalid organization ID header")
		}

		dbCtx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		if _, err := orgService.GetMemberRole(dbCtx, orgID, userID); err != nil {
			return 0, core.ErrNoOrganization
		}
		return orgID, nil
	}

	// 2. Fallback: use the user's first organization
	dbCtx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	orgs, err := orgService.GetUserOrganizations(dbCtx, userID)
	if err != nil || len(orgs) == 0 {
		return 0, core.ErrNoOrganization
	}
	return orgs[0].ID, nil
}

// GetActiveAppID resolves the application ID from the request context.
// Priority:
// 1. X-Application-ID Header
// 2. Default: 0 (No specific application context)
func GetActiveAppID(r *http.Request) int {
	appIDStr := r.Header.Get("X-Application-ID")
	if appIDStr != "" {
		appID, err := strconv.Atoi(appIDStr)
		if err == nil {
			return appID
		}
	}
	return 0
}
