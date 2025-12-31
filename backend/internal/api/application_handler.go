package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type ApplicationHandler struct {
	service    *core.ApplicationService
	orgService *core.OrganizationService
}

func NewApplicationHandler(service *core.ApplicationService, orgService *core.OrganizationService) *ApplicationHandler {
	return &ApplicationHandler{service: service, orgService: orgService}
}

func (h *ApplicationHandler) getActiveOrgID(r *http.Request) (int, error) {
	userID := GetUserID(r.Context())
	orgs, err := h.orgService.GetUserOrganizations(r.Context(), userID)
	if err != nil || len(orgs) == 0 {
		return 0, core.ErrNoOrganization
	}
	return orgs[0].ID, nil
}

func (h *ApplicationHandler) CreateApplication(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	var req model.CreateApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	app, err := h.service.CreateApplication(r.Context(), orgID, req.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(app)
}

func (h *ApplicationHandler) ListApplications(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	apps, err := h.service.ListApplications(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(apps)
}
