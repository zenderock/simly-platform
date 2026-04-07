package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

// PublicDeviceHandler handles Public API device-related endpoints
type PublicDeviceHandler struct {
	deviceService *core.DeviceService
	orgService    *core.OrganizationService
}

// NewPublicDeviceHandler creates a new PublicDeviceHandler
func NewPublicDeviceHandler(deviceService *core.DeviceService, orgService *core.OrganizationService) *PublicDeviceHandler {
	return &PublicDeviceHandler{
		deviceService: deviceService,
		orgService:    orgService,
	}
}

// PublicDeviceResponse represents the response for device list
type PublicDeviceResponse struct {
	ID            int                 `json:"id"`
	Name          string              `json:"name"`
	Model         string              `json:"model"`
	Status        string              `json:"status"`
	Battery       int                 `json:"battery"`
	Signal        int                 `json:"signal"`
	LastSeenAt    string              `json:"last_seen_at"`
	RequiresSetup bool                `json:"requires_setup"`
	SimCards      []PublicSimResponse `json:"sim_cards"`
}

// PublicSimResponse represents the SIM card info in public response
type PublicSimResponse struct {
	SlotIndex         int    `json:"slot_index"`
	Operator          string `json:"operator"`
	PhoneNumber       string `json:"phone_number"`
	IsActive          bool   `json:"is_active"`
	SupportedPrefixes string `json:"supported_prefixes"`
}

// NOTE: PublicDeviceResponse should arguably include ApplicationID if useful, but maybe not critical for public.
// Skipping adding ApplicationID to response for now to keep it clean unless requested.

// ListDevices handles GET /v1/devices
// Returns all devices belonging to the organization associated with the API key
func (h *PublicDeviceHandler) ListDevices(w http.ResponseWriter, r *http.Request) {
	// Get context values from auth middleware
	orgID := GetPublicOrgID(r.Context())

	if orgID == 0 {
		AuthError(w, "Invalid authentication context")
		return
	}

	// List devices for organization
	devices, err := h.deviceService.ListDevices(r.Context(), orgID, 0)
	if err != nil {
		fmt.Printf("Error listing devices: %v\n", err)
		InternalError(w)
		return
	}

	// Map to public response
	response := make([]PublicDeviceResponse, 0, len(devices))
	for _, d := range devices {
		sims := make([]PublicSimResponse, 0, len(d.SimCards))
		for _, s := range d.SimCards {
			sims = append(sims, PublicSimResponse{
				SlotIndex:         s.SlotIndex,
				Operator:          s.Operator,
				PhoneNumber:       s.PhoneNumber,
				IsActive:          s.IsActive,
				SupportedPrefixes: s.SupportedPrefixes,
			})
		}

		lastSeen := "never"
		if d.LastSeenAt != nil {
			lastSeen = d.LastSeenAt.Format("2006-01-02T15:04:05Z")
		}

		response = append(response, PublicDeviceResponse{
			ID:            d.ID,
			Name:          d.Name,
			Model:         d.Model,
			Status:        d.Status,
			Battery:       d.BatteryLevel,   // Corrected field name
			Signal:        d.SignalStrength, // Corrected field name
			LastSeenAt:    lastSeen,
			RequiresSetup: d.RequiresSetup,
			SimCards:      sims,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GenerateLinkToken handles POST /v1/devices/link-token (white-label only)
func (h *PublicDeviceHandler) GenerateLinkToken(w http.ResponseWriter, r *http.Request) {
	orgID := GetPublicOrgID(r.Context())
	if orgID == 0 {
		AuthError(w, "Invalid authentication context")
		return
	}

	org, err := h.orgService.GetOrganizationByID(r.Context(), orgID)
	if err != nil || !org.IsWhiteLabel {
		http.Error(w, `{"error":"white-label plan required"}`, http.StatusForbidden)
		return
	}

	appID := GetPublicAppID(r.Context())
	token, err := h.deviceService.GenerateLinkToken(r.Context(), orgID, appID)
	if err != nil {
		InternalError(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(token)
}

// GetLinkTokenStatus handles GET /v1/devices/link-token/{token} (white-label only)
func (h *PublicDeviceHandler) GetLinkTokenStatus(w http.ResponseWriter, r *http.Request) {
	orgID := GetPublicOrgID(r.Context())
	if orgID == 0 {
		AuthError(w, "Invalid authentication context")
		return
	}

	org, err := h.orgService.GetOrganizationByID(r.Context(), orgID)
	if err != nil || !org.IsWhiteLabel {
		http.Error(w, `{"error":"white-label plan required"}`, http.StatusForbidden)
		return
	}

	token := chi.URLParam(r, "token")
	if token == "" {
		http.Error(w, "Token required", http.StatusBadRequest)
		return
	}

	status, err := h.deviceService.GetLinkTokenStatus(r.Context(), orgID, token)
	if err != nil {
		InternalError(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}
