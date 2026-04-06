package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
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

	// Enforce Active App ID if present (e.g. App-Scoped API Key)
	if appID := GetActiveAppID(r); appID != 0 {
		req.ApplicationID = &appID
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
		From     string `json:"from"` // Sender's phone number
		To       string `json:"to"`   // Destination SIM number (for DID routing)
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

	if err := h.service.ReceiveSMS(r.Context(), orgID, req.From, req.To, req.Body, req.DeviceID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MessageHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		log.Printf("[ListMessages] Failed to get org ID: %v", err)
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	filter := store.MessageListFilter{}

	// AppID: header/context wins, then query param
	if id := GetActiveAppID(r); id != 0 {
		filter.AppID = &id
	} else if aidStr := r.URL.Query().Get("application_id"); aidStr != "" {
		if aid, err := strconv.Atoi(aidStr); err == nil {
			filter.AppID = &aid
		}
	}

	if cidStr := r.URL.Query().Get("campaign_id"); cidStr != "" {
		if cid, err := strconv.Atoi(cidStr); err == nil {
			filter.CampaignID = &cid
		}
	}
	if sdStr := r.URL.Query().Get("start_date"); sdStr != "" {
		if t, err := time.Parse(time.RFC3339, sdStr); err == nil {
			filter.StartDate = &t
		} else if t, err := time.Parse("2006-01-02", sdStr); err == nil {
			filter.StartDate = &t
		}
	}
	if edStr := r.URL.Query().Get("end_date"); edStr != "" {
		if t, err := time.Parse(time.RFC3339, edStr); err == nil {
			filter.EndDate = &t
		} else if t, err := time.Parse("2006-01-02", edStr); err == nil {
			// End of day inclusive
			eod := t.Add(24*time.Hour - time.Second)
			filter.EndDate = &eod
		}
	}

	log.Printf("[ListMessages] Fetching messages for org=%d filter=%+v", orgID, filter)

	messages, err := h.service.ListMessages(r.Context(), orgID, filter)
	if err != nil {
		log.Printf("[ListMessages] Error fetching messages: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("[ListMessages] Successfully fetched %d messages", len(messages))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *MessageHandler) RequeueMessages(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	var req struct {
		CampaignID *int    `json:"campaign_id"`
		StartDate  *string `json:"start_date"`
		EndDate    *string `json:"end_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	filter := core.RequeueFilter{}

	// AppID scoping from context (app-scoped API key or active app header)
	if id := GetActiveAppID(r); id != 0 {
		filter.AppID = &id
	}
	filter.CampaignID = req.CampaignID

	parseDate := func(s string) *time.Time {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return &t
		}
		if t, err := time.Parse("2006-01-02", s); err == nil {
			return &t
		}
		return nil
	}

	if req.StartDate != nil && *req.StartDate != "" {
		filter.StartDate = parseDate(*req.StartDate)
	}
	if req.EndDate != nil && *req.EndDate != "" {
		t := parseDate(*req.EndDate)
		if t != nil {
			// End of day inclusive when date-only format
			if len(*req.EndDate) == 10 {
				eod := t.Add(24*time.Hour - time.Second)
				filter.EndDate = &eod
			} else {
				filter.EndDate = t
			}
		}
	}

	result, err := h.service.BulkRequeue(r.Context(), orgID, filter)
	if err != nil {
		log.Printf("[RequeueMessages] Error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
// RequeueOne re-enqueues a single message by ID. Only works if status is "queued".
func (h *MessageHandler) RequeueOne(w http.ResponseWriter, r *http.Request) {
	msgIDStr := chi.URLParam(r, "id")
	msgID, err := strconv.Atoi(msgIDStr)
	if err != nil {
		http.Error(w, "Invalid message ID", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	result, err := h.service.RequeueOne(r.Context(), orgID, msgID)
	if err != nil {
		log.Printf("[RequeueOne] Error: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *MessageHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	msgIDStr := chi.URLParam(r, "id")
	msgID, err := strconv.Atoi(msgIDStr)
	if err != nil {
		log.Printf("[UpdateStatus] Invalid message ID: %s", msgIDStr)
		http.Error(w, "Invalid message ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Status       string `json:"status"`
		ErrorCode    string `json:"error_code"`
		ErrorMessage string `json:"error_message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[UpdateStatus] Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[UpdateStatus] Updating message %d: status=%s, error_code=%s, error_message=%s", msgID, req.Status, req.ErrorCode, req.ErrorMessage)

	if err := h.service.UpdateStatus(r.Context(), msgID, req.Status, req.ErrorCode, req.ErrorMessage); err != nil {
		log.Printf("[UpdateStatus] Error updating message %d: %v", msgID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("[UpdateStatus] Successfully updated message %d", msgID)
	w.WriteHeader(http.StatusOK)
}
