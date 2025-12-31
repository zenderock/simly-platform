package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

type AlertHandler struct {
	service    *core.AlertService // I'll need to add ListAlerts to service
	orgService *core.OrganizationService
}

func NewAlertHandler(service *core.AlertService, orgService *core.OrganizationService) *AlertHandler {
	return &AlertHandler{
		service:    service,
		orgService: orgService,
	}
}

func (h *AlertHandler) ListAlerts(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	alerts, err := h.service.ListAlerts(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}

func (h *AlertHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	alertIDStr := chi.URLParam(r, "alertID")
	alertID, err := strconv.Atoi(alertIDStr)
	if err != nil {
		http.Error(w, "Invalid Alert ID", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	if err := h.service.MarkAsRead(r.Context(), alertID, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// CreateTestAlert creates a test notification for development/demo purposes
func (h *AlertHandler) CreateTestAlert(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// Create a test alert
	err = h.service.NotifyOrganization(
		r.Context(),
		orgID,
		"test_notification",
		"Test Notification",
		"This is a test notification to demonstrate the alert system. Everything is working correctly!",
		"info",
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Test alert created successfully",
	})
}
