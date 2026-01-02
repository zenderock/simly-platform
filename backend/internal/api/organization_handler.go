package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type OrganizationHandler struct {
	service      *core.OrganizationService
	auditService *core.AuditService
	pricePro     string
	priceAgency  string
}

func NewOrganizationHandler(service *core.OrganizationService, auditService *core.AuditService, pricePro, priceAgency string) *OrganizationHandler {
	return &OrganizationHandler{
		service:      service,
		auditService: auditService,
		pricePro:     pricePro,
		priceAgency:  priceAgency,
	}
}

func (h *OrganizationHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	type AddMemberRequest struct {
		UserID int    `json:"user_id"`
		Role   string `json:"role"`
	}
	var req AddMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check Permissions
	userID := GetUserID(r.Context())
	role, err := h.service.GetMemberRole(r.Context(), orgID, userID)
	if err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}
	if role != "owner" && role != "admin" {
		http.Error(w, "Unauthorized: only owners and admins can invite members", http.StatusForbidden)
		return
	}

	if err := h.service.AddMember(r.Context(), orgID, req.UserID, req.Role); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	h.auditService.Log(r.Context(), orgID, &userID, "member.added", "user", strconv.Itoa(req.UserID), map[string]string{"role": req.Role}, r.RemoteAddr)

	w.WriteHeader(http.StatusCreated)
}

func (h *OrganizationHandler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())

	type CreateOrgRequest struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	var req CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Slug == "" {
		req.Slug = "org-" + strconv.Itoa(userID) + "-" + req.Name // naive slug
	}

	org, err := h.service.CreateOrganization(r.Context(), userID, req.Name, req.Slug, "owner")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(org)
}

func (h *OrganizationHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "userID")
	targetUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid User ID", http.StatusBadRequest)
		return
	}

	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// Check Permissions
	userID := GetUserID(r.Context())
	role, err := h.service.GetMemberRole(r.Context(), orgID, userID)
	if err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}
	if role != "owner" && role != "admin" {
		http.Error(w, "Unauthorized: only owners and admins can remove members", http.StatusForbidden)
		return
	}

	if err := h.service.RemoveMember(r.Context(), orgID, targetUserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	userID = GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "member.removed", "user", userIDStr, nil, r.RemoteAddr)

	w.WriteHeader(http.StatusNoContent)
}

func (h *OrganizationHandler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	orgs, err := h.service.GetUserOrganizations(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to fetch organizations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orgs)
}

func (h *OrganizationHandler) GetOrganization(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	org, err := h.service.GetOrganizationByID(r.Context(), orgID)
	if err != nil {
		http.Error(w, "Failed to fetch organization", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(org)
}

func (h *OrganizationHandler) UpdateOrganization(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	type UpdateOrgRequest struct {
		Name string `json:"name"`
	}
	var req UpdateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check permissions
	userID := GetUserID(r.Context())
	role, err := h.service.GetMemberRole(r.Context(), orgID, userID)
	if err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}
	if role != "owner" && role != "admin" {
		http.Error(w, "Unauthorized: only owners and admins can update organization", http.StatusForbidden)
		return
	}

	if err := h.service.UpdateOrganization(r.Context(), orgID, req.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	h.auditService.Log(r.Context(), orgID, &userID, "organization.updated", "organization", strconv.Itoa(orgID), map[string]string{"name": req.Name}, r.RemoteAddr)

	w.WriteHeader(http.StatusOK)
}

func (h *OrganizationHandler) GetOrganizationStats(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	stats, err := h.service.GetOrganizationStats(r.Context(), orgID)
	if err != nil {
		http.Error(w, "Failed to fetch organization stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *OrganizationHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans := make([]model.Plan, len(model.AvailablePlans))
	copy(plans, model.AvailablePlans)

	for i := range plans {
		if plans[i].ID == model.PlanPro {
			plans[i].StripePriceID = h.pricePro
		} else if plans[i].ID == model.PlanAgency {
			plans[i].StripePriceID = h.priceAgency
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plans)
}

func (h *OrganizationHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	type UpdatePlanRequest struct {
		Plan string `json:"plan"`
	}
	var req UpdatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Validate plan using centralized definition
	if model.GetPlanByID(req.Plan) == nil {
		http.Error(w, "Invalid plan", http.StatusBadRequest)
		return
	}

	// Check permissions - only owner can change plan
	userID := GetUserID(r.Context())
	role, err := h.service.GetMemberRole(r.Context(), orgID, userID)
	if err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}
	if role != "owner" {
		http.Error(w, "Unauthorized: only owners can change the plan", http.StatusForbidden)
		return
	}

	if err := h.service.UpdatePlan(r.Context(), orgID, req.Plan); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	h.auditService.Log(r.Context(), orgID, &userID, "organization.plan_updated", "organization", strconv.Itoa(orgID), map[string]string{"plan": req.Plan}, r.RemoteAddr)

	w.WriteHeader(http.StatusOK)
}

func (h *OrganizationHandler) GetDispatchSettings(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	settings, err := h.service.GetDispatchSettings(r.Context(), orgID)
	if err != nil {
		http.Error(w, "Failed to fetch dispatch settings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func (h *OrganizationHandler) UpdateDispatchSettings(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.service)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	// Check permissions - only owner and admin can change dispatch settings
	userID := GetUserID(r.Context())
	role, err := h.service.GetMemberRole(r.Context(), orgID, userID)
	if err != nil {
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}
	if role != "owner" && role != "admin" {
		http.Error(w, "Unauthorized: only owners and admins can change dispatch settings", http.StatusForbidden)
		return
	}

	type UpdateDispatchSettingsRequest struct {
		SMSThrottleRateSeconds int    `json:"sms_throttle_rate_seconds"`
		SendWindowStart        int    `json:"send_window_start"`
		SendWindowEnd          int    `json:"send_window_end"`
		SendWindowTimezone     string `json:"send_window_timezone"`
	}
	var req UpdateDispatchSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Validate settings
	if req.SMSThrottleRateSeconds < 1 {
		http.Error(w, "Throttle rate must be at least 1 second", http.StatusBadRequest)
		return
	}
	if req.SendWindowStart < 0 || req.SendWindowStart > 23 {
		http.Error(w, "Send window start must be between 0 and 23", http.StatusBadRequest)
		return
	}
	if req.SendWindowEnd < 0 || req.SendWindowEnd > 23 {
		http.Error(w, "Send window end must be between 0 and 23", http.StatusBadRequest)
		return
	}
	if req.SendWindowTimezone == "" {
		http.Error(w, "Send window timezone is required", http.StatusBadRequest)
		return
	}

	settings := &store.OrganizationDispatchSettings{
		SMSThrottleRateSeconds: req.SMSThrottleRateSeconds,
		SendWindowStart:        req.SendWindowStart,
		SendWindowEnd:          req.SendWindowEnd,
		SendWindowTimezone:     req.SendWindowTimezone,
	}

	if err := h.service.UpdateDispatchSettings(r.Context(), orgID, settings); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	h.auditService.Log(r.Context(), orgID, &userID, "organization.dispatch_settings_updated", "organization", strconv.Itoa(orgID), map[string]string{
		"throttle_rate": strconv.Itoa(req.SMSThrottleRateSeconds),
		"window_start":  strconv.Itoa(req.SendWindowStart),
		"window_end":    strconv.Itoa(req.SendWindowEnd),
		"timezone":      req.SendWindowTimezone,
	}, r.RemoteAddr)

	w.WriteHeader(http.StatusOK)
}
