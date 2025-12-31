package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type WebhookHandler struct {
	service      *core.WebhookService
	orgService   *core.OrganizationService
	auditService *core.AuditService
}

func NewWebhookHandler(service *core.WebhookService, orgService *core.OrganizationService, auditService *core.AuditService) *WebhookHandler {
	return &WebhookHandler{service: service, orgService: orgService, auditService: auditService}
}

func (h *WebhookHandler) RegisterWebhook(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
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
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(webhook)

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "webhook.created", "webhook", strconv.Itoa(webhook.ID), map[string]string{"url": req.URL}, r.RemoteAddr)
}

func (h *WebhookHandler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
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

func (h *WebhookHandler) DeleteWebhook(w http.ResponseWriter, r *http.Request) {
	webhookIDStr := chi.URLParam(r, "webhookID")
	webhookID, err := strconv.Atoi(webhookIDStr)
	if err != nil {
		http.Error(w, "Invalid Webhook ID", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	if err := h.service.DeleteWebhook(r.Context(), webhookID, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "webhook.deleted", "webhook", webhookIDStr, nil, r.RemoteAddr)

	w.WriteHeader(http.StatusNoContent)
}
