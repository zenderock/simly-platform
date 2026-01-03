package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

type PublicCampaignHandler struct {
	service *core.CampaignService
}

func NewPublicCampaignHandler(service *core.CampaignService) *PublicCampaignHandler {
	return &PublicCampaignHandler{service: service}
}

// LaunchCampaign triggers a campaign using an API Key (Public API)
func (h *PublicCampaignHandler) LaunchCampaign(w http.ResponseWriter, r *http.Request) {
	// 1. Get Context Info (from Middleware)
	orgID, ok := r.Context().Value(orgIDKey).(int)
	if !ok || orgID == 0 {
		http.Error(w, "Unauthorized: Invalid Organization Context", http.StatusUnauthorized)
		return
	}

	// 2. Wrap Service with Org-Specific Context/Store if needed
	// The service methods already take orgID, so we can pass it directly.

	// 3. Get Campaign ID
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid campaign ID", http.StatusBadRequest)
		return
	}

	// 4. Launch Campaign via Service
	if err := h.service.LaunchCampaign(r.Context(), id, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":      "launched",
		"campaign_id": idStr,
	})
}

// GetCampaign retrieves campaign details including status
func (h *PublicCampaignHandler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	// 1. Get Context Info (from Middleware)
	orgID, ok := r.Context().Value(orgIDKey).(int)
	if !ok || orgID == 0 {
		http.Error(w, "Unauthorized: Invalid Organization Context", http.StatusUnauthorized)
		return
	}

	// 2. Get Campaign ID
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid campaign ID", http.StatusBadRequest)
		return
	}

	// 3. Get Campaign via Service
	campaign, err := h.service.GetCampaign(r.Context(), id, orgID)
	if err != nil {
		if err.Error() == "unauthorized" {
			http.Error(w, "Campaign not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4. Return Campaign Details
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaign)
}

// ListCampaigns retrieves all campaigns, optionally filtered by status
func (h *PublicCampaignHandler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	// 1. Get Context Info
	orgID, ok := r.Context().Value(orgIDKey).(int)
	if !ok || orgID == 0 {
		http.Error(w, "Unauthorized: Invalid Organization Context", http.StatusUnauthorized)
		return
	}

	// 2. Check for details filter status
	status := r.URL.Query().Get("status")

	// 3. Get Campaigns via Service
	var campaigns interface{}
	var err error

	if status != "" {
		campaigns, err = h.service.ListCampaignsByStatus(r.Context(), orgID, status)
	} else {
		campaigns, err = h.service.ListCampaigns(r.Context(), orgID)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4. Return List
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaigns)
}
