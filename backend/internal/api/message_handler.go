package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type MessageHandler struct {
	service    *core.MessageService
	orgService *core.OrganizationService
}

func NewMessageHandler(service *core.MessageService, orgService *core.OrganizationService) *MessageHandler {
	return &MessageHandler{service: service, orgService: orgService}
}

func (h *MessageHandler) SendSMS(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	var req model.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	msg, err := h.service.SendSMS(r.Context(), orgID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

func (h *MessageHandler) InternalReceiveSMS(w http.ResponseWriter, r *http.Request) {
	// For Inbound, the Device identifies itself.
	// But how do we know the Org? The Device is linked to Org.
	// This handler is protected by User Auth usually, but for a Device calling?
	// Note: We haven't implemented Device Auth yet.
	// Assuming the device is authenticated as a User (owner) for now.

	// BUT, if we use API Key or Device Token, we would extract Device -> Org.
	// Since we use Bearer Token of User, we can find the Org.

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// This payload comes from the Android App
	var req struct {
		From     string `json:"from"`
		Body     string `json:"body"`
		DeviceID int    `json:"device_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.ReceiveSMS(r.Context(), orgID, req.From, req.Body, req.DeviceID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MessageHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
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

	messages, err := h.service.ListMessages(r.Context(), orgID, appID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
