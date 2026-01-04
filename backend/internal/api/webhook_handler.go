package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

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
	appID := GetActiveAppID(r)

	var req model.CreateWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if appID != 0 {
		req.ApplicationID = &appID
	}

	webhook, err := h.service.RegisterWebhook(r.Context(), orgID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

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
	appID := GetActiveAppID(r)

	webhooks, err := h.service.ListWebhooks(r.Context(), orgID, appID)
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

// TestWebhookResponse represents the response from testing a webhook
type TestWebhookResponse struct {
	Success    bool   `json:"success"`
	StatusCode int    `json:"status_code,omitempty"`
	Message    string `json:"message"`
	Duration   int64  `json:"duration_ms"`
}

func (h *WebhookHandler) TestWebhook(w http.ResponseWriter, r *http.Request) {
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

	// Get the webhook to verify ownership and get URL
	// We pass 0 for appID here because we want to find the webhook by ID regardless of current app context?
	// Or should we enforce app context?
	// If user is in App A, they should only be able to test Webhooks of App A.
	appID := GetActiveAppID(r)
	webhooks, err := h.service.ListWebhooks(r.Context(), orgID, appID)
	if err != nil {
		http.Error(w, "Failed to fetch webhooks", http.StatusInternalServerError)
		return
	}

	var webhook *model.Webhook
	for _, wh := range webhooks {
		if wh.ID == webhookID {
			webhook = &wh
			break
		}
	}

	if webhook == nil {
		http.Error(w, "Webhook not found", http.StatusNotFound)
		return
	}

	// Send test payload
	startTime := time.Now()
	result := h.service.SendTestWebhook(*webhook)
	duration := time.Since(startTime).Milliseconds()

	response := TestWebhookResponse{
		Success:    result.Success,
		StatusCode: result.StatusCode,
		Message:    result.Message,
		Duration:   duration,
	}

	w.Header().Set("Content-Type", "application/json")
	if result.Success {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusBadGateway)
	}
	json.NewEncoder(w).Encode(response)

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "webhook.tested", "webhook", webhookIDStr, map[string]string{
		"success": strconv.FormatBool(result.Success),
	}, r.RemoteAddr)
}
