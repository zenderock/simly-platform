package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

type OrganizationHandler struct {
	service      *core.OrganizationService
	auditService *core.AuditService
}

func NewOrganizationHandler(service *core.OrganizationService, auditService *core.AuditService) *OrganizationHandler {
	return &OrganizationHandler{service: service, auditService: auditService}
}

// Helper to get active Org ID (MVP: First available org)
func (h *OrganizationHandler) getActiveOrgID(r *http.Request) (int, error) {
	userID := GetUserID(r.Context())
	orgs, err := h.service.GetUserOrganizations(r.Context(), userID)
	if err != nil || len(orgs) == 0 {
		return 0, core.ErrNoOrganization
	}
	return orgs[0].ID, nil
}

func (h *OrganizationHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	orgID, err := h.getActiveOrgID(r)
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

func (h *OrganizationHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "userID")
	targetUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid User ID", http.StatusBadRequest)
		return
	}

	orgID, err := h.getActiveOrgID(r)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	if err := h.service.RemoveMember(r.Context(), orgID, targetUserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit
	userID := GetUserID(r.Context())
	h.auditService.Log(r.Context(), orgID, &userID, "member.removed", "user", userIDStr, nil, r.RemoteAddr)

	w.WriteHeader(http.StatusNoContent)
}
