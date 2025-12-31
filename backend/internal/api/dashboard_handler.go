package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
)

type DashboardHandler struct {
	service    *core.DashboardService
	orgService *core.OrganizationService
}

func NewDashboardHandler(service *core.DashboardService, orgService *core.OrganizationService) *DashboardHandler {
	return &DashboardHandler{service: service, orgService: orgService}
}

func (h *DashboardHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	stats, err := h.service.GetStats(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
