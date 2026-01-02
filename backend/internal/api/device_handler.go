package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type DeviceHandler struct {
	service      *core.DeviceService
	orgService   *core.OrganizationService
	auditService *core.AuditService
}

func NewDeviceHandler(service *core.DeviceService, orgService *core.OrganizationService, auditService *core.AuditService) *DeviceHandler {
	return &DeviceHandler{service: service, orgService: orgService, auditService: auditService}
}

func (h *DeviceHandler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
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
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(device)

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "device.registered", "device", strconv.Itoa(device.ID), map[string]string{"name": req.Name}, r.RemoteAddr)
}

func (h *DeviceHandler) ListDevices(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
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

	var req model.UpdateDeviceStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// If body is empty, we just treat it as a presence heartbeat
	}

	messages, err := h.service.Heartbeat(r.Context(), deviceID, req.BatteryLevel, req.SignalStrength, req.SimCards)
	if err != nil {
		http.Error(w, "Heartbeat failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *DeviceHandler) DeleteDevice(w http.ResponseWriter, r *http.Request) {
	deviceIDStr := chi.URLParam(r, "deviceID")
	deviceID, err := strconv.Atoi(deviceIDStr)
	if err != nil {
		http.Error(w, "Invalid Device ID", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	if err := h.service.DeleteDevice(r.Context(), deviceID, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "device.deleted", "device", deviceIDStr, nil, r.RemoteAddr)

	w.WriteHeader(http.StatusNoContent)
}

// GenerateLinkToken creates a new device link token for QR code
func (h *DeviceHandler) GenerateLinkToken(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	token, err := h.service.GenerateLinkToken(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(token)
}

// GetLinkTokenStatus checks if a token has been used
func (h *DeviceHandler) GetLinkTokenStatus(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		http.Error(w, "Token required", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	status, err := h.service.GetLinkTokenStatus(r.Context(), orgID, token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// LinkDevice links a device using a token (called by mobile app - public endpoint)
func (h *DeviceHandler) LinkDevice(w http.ResponseWriter, r *http.Request) {
	log.Println("LinkDevice called")
	var req model.LinkDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("LinkDevice: failed to decode body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("LinkDevice: token=%s, name=%s", req.Token, req.Name)

	device, err := h.service.LinkDevice(r.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "link token has expired" || err.Error() == "link token has already been used" || err.Error() == "invalid link token" {
			status = http.StatusBadRequest
		}
		http.Error(w, err.Error(), status)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(device)
}
