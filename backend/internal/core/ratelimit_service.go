package core

import (
	"context"
	"fmt"
	"sync"

	"github.com/zenderock/simly-backend/internal/store"
	"golang.org/x/time/rate"
)

// RateLimitService handles burst (TPS) limits and feature constraints for pay-per-use pricing
type RateLimitService struct {
	store         *store.Store
	pricingEngine *PricingEngine
	usageService  *UsageService
	// In-memory limiters for burst control. Key: ApplicationID
	limiters map[int]*rate.Limiter
	mu       sync.Mutex
}

func NewRateLimitService(store *store.Store) *RateLimitService {
	pricingEngine := NewPricingEngine(store)
	usageService := NewUsageService(store, pricingEngine)
	return &RateLimitService{
		store:         store,
		pricingEngine: pricingEngine,
		usageService:  usageService,
		limiters:      make(map[int]*rate.Limiter),
	}
}

// AllowRequest checks if we should proceed with SMS sending. Returns error if limited.
// Only checks burst limits - no monthly quotas in pay-per-use model.
func (s *RateLimitService) AllowRequest(ctx context.Context, appID int, orgID int) error {
	// Get organization to check burst limits
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	// Update limiter with org's burst limit
	if org.SMSBurstLimit > 0 {
		s.UpdateLimiterForOrg(appID, org.SMSBurstLimit)
	}

	// Check Burst Limit (In-Memory Token Bucket)
	limiter := s.getLimiter(appID)
	if !limiter.Allow() {
		return fmt.Errorf("rate limit exceeded (too many requests per second)")
	}

	return nil
}

// RecordUsage should be called AFTER a successful SMS send to track usage for billing
func (s *RateLimitService) RecordUsage(ctx context.Context, appID int, orgID int, messageID int, cost float64) error {
	return s.usageService.RecordSMSUsage(ctx, orgID, &appID, &messageID, cost)
}

func (s *RateLimitService) getLimiter(appID int) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()

	limiter, exists := s.limiters[appID]
	if !exists {
		// Default limits - will be updated per-org when checking quota
		limit := rate.Limit(5.0)
		burst := 10
		limiter = rate.NewLimiter(limit, burst)
		s.limiters[appID] = limiter
	}
	return limiter
}

// UpdateLimiterForOrg updates the rate limiter based on organization's plan
func (s *RateLimitService) UpdateLimiterForOrg(appID int, burstLimit int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Convert burst limit to rate (requests per second)
	ratePerSecond := float64(burstLimit) / 60.0 // burst per minute -> per second
	if ratePerSecond < 1 {
		ratePerSecond = 1
	}
	limiter := rate.NewLimiter(rate.Limit(ratePerSecond), burstLimit)
	s.limiters[appID] = limiter
}

// CheckFeatureLimit validates if an organization can create more of a specific feature type
func (s *RateLimitService) CheckFeatureLimit(ctx context.Context, orgID int, featureType string, currentCount int) error {
	return s.pricingEngine.CheckFeatureLimit(ctx, orgID, featureType, currentCount)
}

// CalculateSMSCost calculates the cost of an SMS based on the organization's plan
func (s *RateLimitService) CalculateSMSCost(ctx context.Context, orgID int) (float64, error) {
	return s.pricingEngine.CalculateSMSCost(ctx, orgID, 1) // Single SMS
}

// RecordApplicationUsage records application creation for feature limit tracking
func (s *RateLimitService) RecordApplicationUsage(ctx context.Context, orgID int, appID int) error {
	return s.usageService.RecordApplicationUsage(ctx, orgID, appID)
}

// RecordContactUsage records contact creation for feature limit tracking
func (s *RateLimitService) RecordContactUsage(ctx context.Context, orgID int, contactID int) error {
	return s.usageService.RecordContactUsage(ctx, orgID, contactID)
}

// RecordCampaignUsage records campaign creation for feature limit tracking
func (s *RateLimitService) RecordCampaignUsage(ctx context.Context, orgID int, campaignID int) error {
	return s.usageService.RecordCampaignUsage(ctx, orgID, campaignID)
}
