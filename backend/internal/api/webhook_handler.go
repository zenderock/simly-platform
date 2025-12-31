package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type WebhookHandler struct {
	service    *core.WebhookService
	orgService *core.OrganizationService
}

func NewWebhookHandler(service *core.WebhookService, orgService *core.OrganizationService) *WebhookHandler {
	return &WebhookHandler{service: service, orgService: orgService}
}

func (h *WebhookHandler) getActiveOrgID(r *http.Request) (int, error) {
	userID := GetUserID(r.Context())
	orgs, err := h.orgService.GetUserOrganizations(r.Context(), userID)
	if err != nil || len(orgs) == 0 {
		return 0, core.ErrNoOrganization
	}
	return orgs[0].ID, nil
}

func (h *WebhookHandler) RegisterWebhook(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	var req model.CreateWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	webhook, err := h.service.RegisterWebhook(r.Context(), orgID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(webhook)
}

func (h *WebhookHandler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	webhooks, err := h.service.ListWebhooks(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(webhooks)
}
