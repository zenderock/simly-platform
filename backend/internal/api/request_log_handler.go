package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

// RequestLogHandler handles request log API endpoints for the dashboard
type RequestLogHandler struct {
	service    *core.RequestLogService
	orgService *core.OrganizationService
}

// NewRequestLogHandler creates a new RequestLogHandler instance
func NewRequestLogHandler(service *core.RequestLogService, orgService *core.OrganizationService) *RequestLogHandler {
	return &RequestLogHandler{
		service:    service,
		orgService: orgService,
	}
}

// ListRequestLogs handles GET /api/request-logs
// Returns paginated request logs with optional filters for status_code and path
func (h *RequestLogHandler) ListRequestLogs(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// Parse query parameters for filters
	filters := model.RequestLogFilters{}

	// Status code filter
	if statusStr := r.URL.Query().Get("status_code"); statusStr != "" {
		if status, err := strconv.Atoi(statusStr); err == nil {
			filters.StatusCode = &status
		}
	}

	// Path filter
	if path := r.URL.Query().Get("path"); path != "" {
		filters.Path = &path
	}

	// Pagination: limit (default 100, max 100)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			if limit > 100 {
				limit = 100
			}
			filters.Limit = limit
		}
	}

	// Pagination: offset
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}

	logs, err := h.service.ListLogs(r.Context(), orgID, filters)
	if err != nil {
		http.Error(w, "Failed to fetch request logs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

// GetRequestLog handles GET /api/request-logs/{id}
// Returns full details of a single request log entry
func (h *RequestLogHandler) GetRequestLog(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	logIDStr := chi.URLParam(r, "id")
	logID, err := strconv.Atoi(logIDStr)
	if err != nil {
		http.Error(w, "Invalid log ID", http.StatusBadRequest)
		return
	}

	log, err := h.service.GetLog(r.Context(), logID, orgID)
	if err != nil {
		http.Error(w, "Request log not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(log)
}
