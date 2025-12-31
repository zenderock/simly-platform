package api

import (
	"encoding/json"
	"net/http"
	"strconv"

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

	var appID *int
	if aidStr := r.URL.Query().Get("application_id"); aidStr != "" {
		if aid, err := strconv.Atoi(aidStr); err == nil {
			appID = &aid
		}
	}

	stats, err := h.service.GetStats(r.Context(), int64(orgID), appID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *DashboardHandler) GetTrafficStats(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// Default to 30 days
	days := 30
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil {
			days = d
		}
	}

	var appID *int
	if aidStr := r.URL.Query().Get("application_id"); aidStr != "" {
		if aid, err := strconv.Atoi(aidStr); err == nil {
			appID = &aid
		}
	}

	stats, err := h.service.GetTrafficStats(r.Context(), int64(orgID), days, appID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
