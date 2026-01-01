package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

type BillingHandler struct {
	billingService *core.BillingService
	orgService     *core.OrganizationService
}

func NewBillingHandler(billingService *core.BillingService, orgService *core.OrganizationService) *BillingHandler {
	return &BillingHandler{
		billingService: billingService,
		orgService:     orgService,
	}
}

func (h *BillingHandler) RegisterRoutes(r chi.Router) {
	r.Post("/checkout", h.CreateCheckoutSession)
	r.Post("/portal", h.CreateBillingPortalSession)
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

// Helpers placeholders - Assuming functionality exists in Middleware or Context
func getUserEmailFromContext(r *http.Request) string {
	// TODO: implement extraction from claims
	// For now return empty string, Stripe will ask if needed or rely on Customer ID if exists
	// Ideally we get this from the JWT claims stored in context
	claims, ok := r.Context().Value("claims").(map[string]interface{})
	if !ok {
		return ""
	}
	if email, ok := claims["email"].(string); ok {
		return email
	}
	return ""
}

func getOrgIDFromContext(r *http.Request) int {
	// Deprecated: use GetActiveOrgID instead
	return 0
}
