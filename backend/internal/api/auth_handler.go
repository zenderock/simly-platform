package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type AuthHandler struct {
	service        *core.UserService
	captchaService *core.CaptchaService
	emailValidator *core.EmailValidator
}

func NewAuthHandler(service *core.UserService, captchaService *core.CaptchaService, emailValidator *core.EmailValidator) *AuthHandler {
	return &AuthHandler{
		service:        service,
		captchaService: captchaService,
		emailValidator: emailValidator,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify Turnstile Token
	if err := h.captchaService.VerifyToken(r.Context(), req.TurnstileToken); err != nil {
		http.Error(w, "Security check failed", http.StatusForbidden)
		return
	}

	user, err := h.service.Register(r.Context(), req)
	if err != nil {
		if err.Error() == "email already registered" {
			RespondWithError(w, http.StatusConflict, "Email already registered")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Registration failed")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify Turnstile Token
	if err := h.captchaService.VerifyToken(r.Context(), req.TurnstileToken); err != nil {
		http.Error(w, "Security check failed", http.StatusForbidden)
		return
	}

	resp, err := h.service.Login(r.Context(), req)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
