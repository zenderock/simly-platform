package api

import (
	"crypto/subtle"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type BillingHandler struct {
	billingService     *core.BillingService
	orgService         *core.OrganizationService
	billingAdminSecret string
}

func NewBillingHandler(billingService *core.BillingService, orgService *core.OrganizationService, billingAdminSecret string) *BillingHandler {
	return &BillingHandler{
		billingService:     billingService,
		orgService:         orgService,
		billingAdminSecret: billingAdminSecret,
	}
}

func (h *BillingHandler) RegisterRoutes(r chi.Router) {
	r.Post("/checkout", h.CreateCheckoutSession)
	r.Post("/portal", h.CreateBillingPortalSession)
}

func (h *BillingHandler) RegisterInternalRoutes(r chi.Router) {
	r.Get("/trial-settings", h.GetTrialSettings)
	r.Put("/trial-settings", h.UpdateTrialSettings)
}

// RegisterPublicRoutes registers routes that don't need authentication (like webhooks)
func (h *BillingHandler) RegisterPublicRoutes(r chi.Router) {
	r.Post("/webhooks/stripe", h.HandleStripeWebhook)
}

type CreateCheckoutRequest struct {
	PriceID string `json:"price_id"`
}

func (h *BillingHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}
	userEmail := getUserEmailFromContext(r)

	var req CreateCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PriceID == "" {
		http.Error(w, "Price ID is required", http.StatusBadRequest)
		return
	}

	url, err := h.billingService.CreateCheckoutSession(r.Context(), orgID, req.PriceID, userEmail)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

func (h *BillingHandler) CreateBillingPortalSession(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	url, err := h.billingService.CreatePortalSession(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

func (h *BillingHandler) HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Request body empty", http.StatusBadRequest)
		return
	}

	signature := r.Header.Get("Stripe-Signature")
	if err := h.billingService.HandleWebhook(payload, signature); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *BillingHandler) GetTrialSettings(w http.ResponseWriter, r *http.Request) {
	if !h.authorizeInternalAdmin(w, r) {
		return
	}

	settings, err := h.billingService.GetTrialSettings(r.Context())
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, settings)
}

func (h *BillingHandler) UpdateTrialSettings(w http.ResponseWriter, r *http.Request) {
	if !h.authorizeInternalAdmin(w, r) {
		return
	}

	type updateTrialSettingsRequest struct {
		Enabled              bool       `json:"enabled"`
		TargetPlanID         string     `json:"target_plan_id"`
		TrialDays            int        `json:"trial_days"`
		StartsAt             *time.Time `json:"starts_at"`
		EndsAt               *time.Time `json:"ends_at"`
		RequirePaymentMethod bool       `json:"require_payment_method"`
	}

	var req updateTrialSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	settings, err := h.billingService.UpdateTrialSettings(r.Context(), &model.BillingTrialSettings{
		Enabled:              req.Enabled,
		TargetPlanID:         req.TargetPlanID,
		TrialDays:            req.TrialDays,
		StartsAt:             req.StartsAt,
		EndsAt:               req.EndsAt,
		RequirePaymentMethod: req.RequirePaymentMethod,
	})
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, settings)
}

// Helpers placeholders - Assuming functionality exists in Middleware or Context
func getUserEmailFromContext(r *http.Request) string {
	// Try to get email from JWT claims stored in context
	claims, ok := r.Context().Value("claims").(map[string]interface{})
	if !ok {
		return ""
	}

	// Try different possible email claim names
	if email, ok := claims["email"].(string); ok && email != "" {
		return email
	}

	// Try alternative claim names
	if email, ok := claims["user_email"].(string); ok && email != "" {
		return email
	}

	if email, ok := claims["sub"].(string); ok && email != "" {
		// Check if sub contains an email format
		if len(email) > 0 && (email[0] != 'u' || len(email) < 10) {
			// Likely an email, not a user ID
			return email
		}
	}

	return ""
}

func getOrgIDFromContext(r *http.Request) int {
	// Deprecated: use GetActiveOrgID instead
	return 0
}

func (h *BillingHandler) authorizeInternalAdmin(w http.ResponseWriter, r *http.Request) bool {
	if h.billingAdminSecret == "" {
		RespondWithError(w, http.StatusServiceUnavailable, "Billing admin API is disabled")
		return false
	}

	providedSecret := r.Header.Get("X-Admin-Secret")
	if subtle.ConstantTimeCompare([]byte(providedSecret), []byte(h.billingAdminSecret)) != 1 {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return false
	}

	return true
}
