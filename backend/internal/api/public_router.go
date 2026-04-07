package api

import (
	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
)

// PublicAPIRouter handles routing for the Public API (/v1/*)
type PublicAPIRouter struct {
	messageHandler    *PublicMessageHandler
	apiKeyService     *core.APIKeyService
	requestLogService *core.RequestLogService
	campaignHandler   *PublicCampaignHandler
	deviceHandler     *PublicDeviceHandler
	brandingHandler   *BrandingHandler
}

// NewPublicAPIRouter creates a new PublicAPIRouter
func NewPublicAPIRouter(
	messageHandler *PublicMessageHandler,
	campaignHandler *PublicCampaignHandler,
	deviceHandler *PublicDeviceHandler,
	brandingHandler *BrandingHandler,
	apiKeyService *core.APIKeyService,
	requestLogService *core.RequestLogService,
) *PublicAPIRouter {
	return &PublicAPIRouter{
		messageHandler:    messageHandler,
		campaignHandler:   campaignHandler,
		deviceHandler:     deviceHandler,
		brandingHandler:   brandingHandler,
		apiKeyService:     apiKeyService,
		requestLogService: requestLogService,
	}
}

// RegisterRoutes registers all Public API routes under the /v1/ prefix
// It applies PublicAPIAuthMiddleware and RequestLoggerMiddleware to all routes
func (pr *PublicAPIRouter) RegisterRoutes(r chi.Router) {
	// Apply middlewares for all /v1/ routes
	r.Use(PublicAPIAuthMiddleware(pr.apiKeyService))
	r.Use(RequestLoggerMiddleware(pr.requestLogService))

	// Device endpoints
	r.Get("/devices", pr.deviceHandler.ListDevices)                           // GET /v1/devices
	r.Post("/devices/link-token", pr.deviceHandler.GenerateLinkToken)         // POST /v1/devices/link-token (white-label)
	r.Get("/devices/link-token/{token}", pr.deviceHandler.GetLinkTokenStatus) // GET /v1/devices/link-token/{token} (white-label)

	// Branding endpoint (white-label)
	r.Get("/branding", pr.brandingHandler.GetBranding) // GET /v1/branding

	// Message endpoints
	r.Route("/messages", func(r chi.Router) {
		r.Post("/", pr.messageHandler.SendMessage)   // POST /v1/messages
		r.Post("/otp", pr.messageHandler.SendOTP)    // POST /v1/messages/otp
		r.Get("/{id}", pr.messageHandler.GetMessage) // GET /v1/messages/{id}
	})

	// Campaign endpoints
	r.Route("/campaigns", func(r chi.Router) {
		r.Get("/", pr.campaignHandler.ListCampaigns)              // GET /v1/campaigns (optional ?status=draft)
		r.Post("/{id}/launch", pr.campaignHandler.LaunchCampaign) // POST /v1/campaigns/{id}/launch
		r.Get("/{id}", pr.campaignHandler.GetCampaign)            // GET /v1/campaigns/{id}
	})
}
