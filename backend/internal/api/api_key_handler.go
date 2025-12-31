package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type APIKeyHandler struct {
	service      *core.APIKeyService
	appService   *core.ApplicationService
	orgService   *core.OrganizationService // To verify ownership
	auditService *core.AuditService
}

func NewAPIKeyHandler(service *core.APIKeyService, appService *core.ApplicationService, orgService *core.OrganizationService, auditService *core.AuditService) *APIKeyHandler {
	return &APIKeyHandler{service: service, appService: appService, orgService: orgService, auditService: auditService}
}

func (h *APIKeyHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	var req model.CreateAPIKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify App belongs to Org
	app, err := h.appService.GetApplication(r.Context(), req.ApplicationID)
	if err != nil {
		http.Error(w, "Application not found", http.StatusNotFound)
		return
	}
	if app.OrganizationID != orgID {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	apiKey, err := h.service.CreateAPIKey(r.Context(), orgID, req.ApplicationID, req.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(apiKey)

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "api_key.created", "api_key", strconv.Itoa(apiKey.ID), map[string]string{"name": req.Name}, r.RemoteAddr)
}

func (h *APIKeyHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	appIDStr := r.URL.Query().Get("application_id")
	appID, err := strconv.Atoi(appIDStr)
	if err != nil {
		http.Error(w, "application_id query param required", http.StatusBadRequest)
		return
	}

	// Verify App
	app, err := h.appService.GetApplication(r.Context(), appID)
	if err != nil {
		http.Error(w, "Application not found", http.StatusNotFound)
		return
	}
	if app.OrganizationID != orgID {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	keys, err := h.service.ListAPIKeys(r.Context(), appID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(keys)
}

func (h *APIKeyHandler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	keyIDStr := chi.URLParam(r, "keyID")
	keyID, err := strconv.Atoi(keyIDStr)
	if err != nil {
		http.Error(w, "Invalid Key ID", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// 1. Verify Ownership
	// We need a way to get Key details. Let's assume fetching list via App is too slow or we don't have AppID here.
	// Best pattern: Service.RevokeAPIKey(ctx, keyID, orgID) and let Service handle the check via SQL.
	// OR: Fetch Key -> Check Org -> Delete.
	// Let's rely on Service to do the "Delete where ID=? AND OrgID=?" for atomicity.

	if err := h.service.RevokeAPIKey(r.Context(), keyID, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	userID := GetUserID(r.Context()) // Assuming AuthMiddleware populates this
	h.auditService.Log(r.Context(), orgID, &userID, "api_key.revoked", "api_key", keyIDStr, nil, r.RemoteAddr)

	w.WriteHeader(http.StatusNoContent)
}
