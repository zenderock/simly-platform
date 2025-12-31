package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type DeviceHandler struct {
	service    *core.DeviceService
	orgService *core.OrganizationService
}

func NewDeviceHandler(service *core.DeviceService, orgService *core.OrganizationService) *DeviceHandler {
	return &DeviceHandler{service: service, orgService: orgService}
}

// Helper to get active Org ID (MVP: First available org)
func (h *DeviceHandler) getActiveOrgID(r *http.Request) (int, error) {
	userID := GetUserID(r.Context())
	orgs, err := h.orgService.GetUserOrganizations(r.Context(), userID)
	if err != nil || len(orgs) == 0 {
		return 0, core.ErrNoOrganization
	}
	return orgs[0].ID, nil
}

func (h *DeviceHandler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	var req model.RegisterDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	device, err := h.service.RegisterDevice(r.Context(), orgID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(device)
}

func (h *DeviceHandler) ListDevices(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	devices, err := h.service.ListDevices(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(devices)
}

func (h *DeviceHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	deviceIDStr := chi.URLParam(r, "deviceID")
	deviceID, err := strconv.Atoi(deviceIDStr)
	if err != nil {
		http.Error(w, "Invalid device ID", http.StatusBadRequest)
		return
	}

	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	if err := h.service.Heartbeat(r.Context(), deviceID, orgID); err != nil {
		http.Error(w, "Heartbeat failed: "+err.Error(), http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}
