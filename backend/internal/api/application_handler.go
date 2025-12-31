package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type ApplicationHandler struct {
	service      *core.ApplicationService
	orgService   *core.OrganizationService
	auditService *core.AuditService
}

func NewApplicationHandler(service *core.ApplicationService, orgService *core.OrganizationService, auditService *core.AuditService) *ApplicationHandler {
	return &ApplicationHandler{service: service, orgService: orgService, auditService: auditService}
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

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "application.created", "application", strconv.Itoa(app.ID), map[string]string{"name": app.Name}, r.RemoteAddr)
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

func (h *ApplicationHandler) DeleteApplication(w http.ResponseWriter, r *http.Request) {
	appIDStr := chi.URLParam(r, "appID")
	appID, err := strconv.Atoi(appIDStr)
	if err != nil {
		http.Error(w, "Invalid App ID", http.StatusBadRequest)
		return
	}

	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	if err := h.service.DeleteApplication(r.Context(), appID, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "application.deleted", "application", appIDStr, nil, r.RemoteAddr)

	w.WriteHeader(http.StatusNoContent)
}
