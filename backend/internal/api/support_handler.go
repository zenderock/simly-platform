package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/store"
)

type SupportHandler struct {
	messageService *core.MessageService
}

func NewSupportHandler(messageService *core.MessageService) *SupportHandler {
	return &SupportHandler{messageService: messageService}
}

func (h *SupportHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	filter, orgID := parseSupportMessageFilter(r)
	messages, err := h.messageService.SearchSupportMessages(r.Context(), filter, orgID)
	if err != nil {
		http.Error(w, "Failed to fetch support messages", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *SupportHandler) GetMessageEvents(w http.ResponseWriter, r *http.Request) {
	msgID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid message ID", http.StatusBadRequest)
		return
	}

	if _, err := h.messageService.GetMessage(r.Context(), msgID); err != nil {
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}

	events, err := h.messageService.ListMessageEventsForSupport(r.Context(), msgID)
	if err != nil {
		http.Error(w, "Failed to fetch message events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func parseSupportMessageFilter(r *http.Request) (store.MessageListFilter, *int) {
	filter := store.MessageListFilter{Limit: 100}
	var orgID *int

	if orgStr := r.URL.Query().Get("organization_id"); orgStr != "" {
		if id, err := strconv.Atoi(orgStr); err == nil {
			orgID = &id
		}
	}
	if appStr := r.URL.Query().Get("application_id"); appStr != "" {
		if id, err := strconv.Atoi(appStr); err == nil {
			filter.AppID = &id
		}
	}
	if deviceStr := r.URL.Query().Get("device_id"); deviceStr != "" {
		if id, err := strconv.Atoi(deviceStr); err == nil {
			filter.DeviceID = &id
		}
	}
	if campaignStr := r.URL.Query().Get("campaign_id"); campaignStr != "" {
		if id, err := strconv.Atoi(campaignStr); err == nil {
			filter.CampaignID = &id
		}
	}
	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		filter.Status = &status
	}
	if category := r.URL.Query().Get("failure_category"); category != "" && category != "all" {
		filter.FailureCategory = &category
	}
	if search := r.URL.Query().Get("search"); search != "" {
		filter.Search = &search
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
			eod := t.Add(24*time.Hour - time.Second)
			filter.EndDate = &eod
		}
	}
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			if limit > 500 {
				limit = 500
			}
			filter.Limit = limit
		}
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filter.Offset = offset
		}
	}

	return filter, orgID
}
