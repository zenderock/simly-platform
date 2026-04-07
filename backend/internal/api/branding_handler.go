package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
)

// BrandingHandler handles branding-related endpoints
type BrandingHandler struct {
	orgService *core.OrganizationService
}

// NewBrandingHandler creates a new BrandingHandler
func NewBrandingHandler(orgService *core.OrganizationService) *BrandingHandler {
	return &BrandingHandler{orgService: orgService}
}

// GetBranding handles GET /v1/branding (public API, white-label only)
func (h *BrandingHandler) GetBranding(w http.ResponseWriter, r *http.Request) {
	orgID := GetPublicOrgID(r.Context())
	if orgID == 0 {
		AuthError(w, "Invalid authentication context")
		return
	}

	org, err := h.orgService.GetOrganizationByID(r.Context(), orgID)
	if err != nil || !org.IsWhiteLabel {
		http.Error(w, `{"error":"white-label plan required"}`, http.StatusForbidden)
		return
	}

	// Default to Simly branding if not configured
	appName := "Gateway"
	if org.BrandingName != nil && *org.BrandingName != "" {
		appName = *org.BrandingName
	}

	logoURL := ""
	if org.BrandingLogoURL != nil {
		logoURL = *org.BrandingLogoURL
	}

	primaryColor := "#8c52ff"
	if org.BrandingColor != nil && *org.BrandingColor != "" {
		primaryColor = *org.BrandingColor
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"app_name":      appName,
		"logo_url":      logoURL,
		"primary_color": primaryColor,
	})
}

// UpdateBranding handles PUT /api/organization/branding (dashboard, white-label only)
func (h *BrandingHandler) UpdateBranding(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	org, err := h.orgService.GetOrganizationByID(r.Context(), orgID)
	if err != nil || !org.IsWhiteLabel {
		http.Error(w, `{"error":"white-label plan required"}`, http.StatusForbidden)
		return
	}

	type UpdateBrandingRequest struct {
		Name    *string `json:"branding_name"`
		LogoURL *string `json:"branding_logo_url"`
		Color   *string `json:"branding_color"`
	}
	var req UpdateBrandingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := h.orgService.UpdateBranding(r.Context(), orgID, req.Name, req.LogoURL, req.Color); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
