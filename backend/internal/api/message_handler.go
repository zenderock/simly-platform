package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type MessageHandler struct {
	service       *core.MessageService
	orgService    *core.OrganizationService
	deviceService *core.DeviceService
}

func NewMessageHandler(service *core.MessageService, orgService *core.OrganizationService, deviceService *core.DeviceService) *MessageHandler {
	return &MessageHandler{service: service, orgService: orgService, deviceService: deviceService}
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
	// 1. Resolve Organization from Context (works for both User and API Key)
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// 2. Parse Payload from Android App
	var req struct {
		From     string `json:"from"`
		Body     string `json:"body"`
		DeviceID int    `json:"device_id"`
		// Timestamp?
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 3. Verify Device Belongs to Org
	if err := h.deviceService.VerifyDeviceOwnership(r.Context(), req.DeviceID, orgID); err != nil {
		http.Error(w, "Unauthorized: Device validation failed", http.StatusForbidden)
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
