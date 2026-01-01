package core

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/zenderock/simly-backend/internal/store"
	"golang.org/x/time/rate"
)

// RateLimitService handles both Burst (TPS) and Quota (Monthly) limits
type RateLimitService struct {
	store *store.Store
	// In-memory limiters for burst control. Key: ApplicationID
	limiters map[int]*rate.Limiter
	mu       sync.Mutex
}

func NewRateLimitService(store *store.Store) *RateLimitService {
	return &RateLimitService{
		store:    store,
		limiters: make(map[int]*rate.Limiter),
	}
}

// AllowRequest checks if we should proceed. Returns error if limited.
func (s *RateLimitService) AllowRequest(ctx context.Context, appID int, orgID int) error {
	// 1. Check Monthly Quota (Database)
	// Optimization: This could be cached, but for MVP we query (or upsert/check).
	quotaExceeded, err := s.checkMonthlyQuota(ctx, appID, orgID)
	if err != nil {
		return fmt.Errorf("quota check failed: %w", err)
	}
	if quotaExceeded {
		return fmt.Errorf("monthly quota exceeded")
	}

	// 2. Update limiter with org's burst limit
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err == nil && org.SMSBurstLimit > 0 {
		s.UpdateLimiterForOrg(appID, org.SMSBurstLimit)
	}

	// 3. Check Burst Limit (In-Memory Token Bucket)
	limiter := s.getLimiter(appID)
	if !limiter.Allow() {
		return fmt.Errorf("rate limit exceeded (too many requests per second)")
	}

	return nil
}

// IncrementUsage should be called AFTER a successful SMS send
func (s *RateLimitService) IncrementUsage(ctx context.Context, appID int, orgID int) error {
	period := time.Now().Format("2006-01") // YYYY-MM
	return s.store.IncrementUsageLedger(ctx, appID, orgID, period)
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

func (s *RateLimitService) checkMonthlyQuota(ctx context.Context, appID, orgID int) (bool, error) {
	period := time.Now().Format("2006-01")
	usage, err := s.store.GetOrganizationUsage(ctx, orgID, period)
	if err != nil {
		// If check fails (e.g. db error), fail closed for safety
		return true, err
	}

	// Fetch Limit (Ideally cached)
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return true, err
	}

	limit := org.SMSMonthlyLimit
	if limit == 0 {
		limit = 100 // Fallback for safety
	}

	return usage >= limit, nil
}
