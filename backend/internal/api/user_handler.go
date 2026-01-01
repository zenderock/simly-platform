package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type UserHandler struct {
	service      *core.UserProfileService
	auditService *core.AuditService
}

func NewUserHandler(service *core.UserProfileService, auditService *core.AuditService) *UserHandler {
	return &UserHandler{service: service, auditService: auditService}
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())

	user, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to get profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())

	var req model.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Basic validation
	if req.Name == "" || req.Email == "" {
		http.Error(w, "Name and email are required", http.StatusBadRequest)
		return
	}

	user, err := h.service.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		if err == core.ErrEmailExists {
			http.Error(w, "Email already exists", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit log
	h.auditService.Log(r.Context(), 0, &userID, "user.profile_updated", "user", "", map[string]string{
		"name":  req.Name,
		"email": req.Email,
	}, r.RemoteAddr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())

	var req model.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Basic validation
	if req.CurrentPassword == "" || req.NewPassword == "" {
		http.Error(w, "Current password and new password are required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		http.Error(w, "New password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	err := h.service.ChangePassword(r.Context(), userID, req)
	if err != nil {
		if err == core.ErrInvalidPassword {
			http.Error(w, "Invalid current password", http.StatusUnauthorized)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit log
	h.auditService.Log(r.Context(), 0, &userID, "user.password_changed", "user", "", nil, r.RemoteAddr)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Password updated successfully"})
}
