package api

import (
	"encoding/json"
	"errors"
	"log"
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
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Verify Turnstile Token
	if err := h.captchaService.VerifyToken(r.Context(), req.TurnstileToken); err != nil {
		RespondWithError(w, http.StatusForbidden, "Security check failed")
		return
	}

	// Validate Email
	if err := h.emailValidator.Validate(r.Context(), req.Email); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.service.Register(r.Context(), req)
	if err != nil {
		if errors.Is(err, core.ErrUserExists) {
			RespondWithError(w, http.StatusConflict, "An account with this email already exists. Try signing in or resetting your password.")
			return
		}
		log.Printf("Registration failed for %q: %v", req.Email, err)
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
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Verify Turnstile Token
	if err := h.captchaService.VerifyToken(r.Context(), req.TurnstileToken); err != nil {
		RespondWithError(w, http.StatusForbidden, "Security check failed")
		return
	}

	// Validate Email
	if err := h.emailValidator.Validate(r.Context(), req.Email); err != nil {
		RespondWithError(w, http.StatusForbidden, "Email address is no longer valid: "+err.Error())
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

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req model.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" {
		RespondWithError(w, http.StatusBadRequest, "Email is required")
		return
	}

	// We don't verify Turnstile here yet to keep it simple, but we could
	err := h.service.ForgotPassword(r.Context(), req.Email)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to send reset email")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "If an account exists, a reset link has been sent."})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req model.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Token == "" || req.Password == "" {
		RespondWithError(w, http.StatusBadRequest, "Token and password are required")
		return
	}

	err := h.service.ResetPassword(r.Context(), req.Token, req.Password)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Your password has been reset successfully."})
}
