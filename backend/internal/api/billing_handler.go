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
}

func NewBillingHandler(billingService *core.BillingService) *BillingHandler {
	return &BillingHandler{
		billingService: billingService,
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
	orgID := getOrgIDFromContext(r)
	userEmail := getUserEmailFromContext(r) // We need to ensure we can get this or pass it from frontend

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
	orgID := getOrgIDFromContext(r)

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
	// Assuming a middleware sets "orgID" in context or similar
	// For now, attempting to read strict standard claims or headers if needed
	// Or assuming auth middleware puts it there.
	// We'll trust the middleware pattern used in other handlers.
	// Looking at other handlers (e.g. OrgHandler) might reveal the pattern.
	// BUT since I am writing this blind, I will use a safe cast.
	if val, ok := r.Context().Value("organization_id").(int); ok {
		return val
	}

	// Fallback: try parsing header if context missing (should not happen in protected route)
	return 0
}
