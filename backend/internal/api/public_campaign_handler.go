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
