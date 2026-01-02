package core

import (
	"context"
	"time"

	"github.com/zenderock/simly-backend/internal/store"
)

// Default send window constants
const (
	DefaultSendWindowStart = 8  // 08:00
	DefaultSendWindowEnd   = 21 // 21:00
	DefaultTimezone        = "UTC"
)

// SendWindow represents a time window during which sending is allowed
type SendWindow struct {
	StartHour int    // 0-23
	EndHour   int    // 0-23
	Timezone  string // e.g., "Europe/Paris", "UTC"
}

// SendWindowManager handles time-based send restrictions
type SendWindowManager struct {
	store *store.Store
}

// NewSendWindowManager creates a new SendWindowManager instance
func NewSendWindowManager(store *store.Store) *SendWindowManager {
	return &SendWindowManager{
		store: store,
	}
}

// IsWithinWindow checks if the current time is within the configured send window
// It first checks campaign-level window, then falls back to organization-level window
func (w *SendWindowManager) IsWithinWindow(ctx context.Context, orgID int, campaignID *int) (bool, error) {
	window, err := w.getEffectiveWindow(ctx, orgID, campaignID)
	if err != nil {
		return false, err
	}

	return w.isTimeWithinWindow(time.Now(), window), nil
}

// IsWithinWindowAt checks if a specific time is within the configured send window
func (w *SendWindowManager) IsWithinWindowAt(ctx context.Context, orgID int, campaignID *int, t time.Time) (bool, error) {
	window, err := w.getEffectiveWindow(ctx, orgID, campaignID)
	if err != nil {
		return false, err
	}

	return w.isTimeWithinWindow(t, window), nil
}

// GetNextWindowOpen calculates when the send window opens next
// Returns the time when sending will be allowed again
func (w *SendWindowManager) GetNextWindowOpen(ctx context.Context, orgID int, campaignID *int) (time.Time, error) {
	window, err := w.getEffectiveWindow(ctx, orgID, campaignID)
	if err != nil {
		return time.Time{}, err
	}

	return w.calculateNextWindowOpen(time.Now(), window), nil
}

// GetNextWindowOpenFrom calculates when the send window opens next from a specific time
func (w *SendWindowManager) GetNextWindowOpenFrom(ctx context.Context, orgID int, campaignID *int, from time.Time) (time.Time, error) {
	window, err := w.getEffectiveWindow(ctx, orgID, campaignID)
	if err != nil {
		return time.Time{}, err
	}

	return w.calculateNextWindowOpen(from, window), nil
}

// getEffectiveWindow retrieves the effective send window for a campaign/organization
// Campaign-level settings override organization-level settings
func (w *SendWindowManager) getEffectiveWindow(ctx context.Context, orgID int, campaignID *int) (*SendWindow, error) {
	// Get organization settings as base
	org, err := w.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// Start with organization defaults
	window := &SendWindow{
		StartHour: org.SendWindowStart,
		EndHour:   org.SendWindowEnd,
		Timezone:  org.SendWindowTimezone,
	}

	// Apply defaults if organization settings are not configured
	if window.StartHour == 0 && window.EndHour == 0 {
		window.StartHour = DefaultSendWindowStart
		window.EndHour = DefaultSendWindowEnd
	}
	if window.Timezone == "" {
		window.Timezone = DefaultTimezone
	}

	// If campaign ID is provided, check for campaign-level overrides
	if campaignID != nil {
		campaign, err := w.store.GetCampaignByID(ctx, *campaignID)
		if err != nil {
			return nil, err
		}

		// Campaign settings override organization settings if set
		if campaign.SendWindowStart != nil {
			window.StartHour = *campaign.SendWindowStart
		}
		if campaign.SendWindowEnd != nil {
			window.EndHour = *campaign.SendWindowEnd
		}
	}

	return window, nil
}

// isTimeWithinWindow checks if a given time falls within the send window
func (w *SendWindowManager) isTimeWithinWindow(t time.Time, window *SendWindow) bool {
	// Load the timezone
	loc, err := time.LoadLocation(window.Timezone)
	if err != nil {
		// Fall back to UTC if timezone is invalid
		loc = time.UTC
	}

	// Convert time to the configured timezone
	localTime := t.In(loc)
	currentHour := localTime.Hour()

	// Handle normal window (e.g., 8-21)
	if window.StartHour < window.EndHour {
		return currentHour >= window.StartHour && currentHour < window.EndHour
	}

	// Handle overnight window (e.g., 22-6 means 22:00 to 06:00 next day)
	if window.StartHour > window.EndHour {
		return currentHour >= window.StartHour || currentHour < window.EndHour
	}

	// StartHour == EndHour means 24-hour window (always open)
	return true
}

// calculateNextWindowOpen calculates when the send window will open next
func (w *SendWindowManager) calculateNextWindowOpen(from time.Time, window *SendWindow) time.Time {
	// Load the timezone
	loc, err := time.LoadLocation(window.Timezone)
	if err != nil {
		loc = time.UTC
	}

	// Convert to local time
	localTime := from.In(loc)
	currentHour := localTime.Hour()

	// If already within window, return current time
	if w.isTimeWithinWindow(from, window) {
		return from
	}

	// Calculate next window open time
	var nextOpen time.Time

	// Handle normal window (e.g., 8-21)
	if window.StartHour < window.EndHour {
		if currentHour < window.StartHour {
			// Window opens later today
			nextOpen = time.Date(
				localTime.Year(), localTime.Month(), localTime.Day(),
				window.StartHour, 0, 0, 0, loc,
			)
		} else {
			// Window opens tomorrow
			tomorrow := localTime.AddDate(0, 0, 1)
			nextOpen = time.Date(
				tomorrow.Year(), tomorrow.Month(), tomorrow.Day(),
				window.StartHour, 0, 0, 0, loc,
			)
		}
	} else if window.StartHour > window.EndHour {
		// Handle overnight window (e.g., 22-6)
		if currentHour >= window.EndHour && currentHour < window.StartHour {
			// We're in the gap, window opens later today at StartHour
			nextOpen = time.Date(
				localTime.Year(), localTime.Month(), localTime.Day(),
				window.StartHour, 0, 0, 0, loc,
			)
		} else {
			// Should not reach here if isTimeWithinWindow is correct
			nextOpen = from
		}
	} else {
		// 24-hour window, always open
		nextOpen = from
	}

	return nextOpen
}

// GetWindowCloseTime returns when the current window will close
// Returns zero time if not currently within a window
func (w *SendWindowManager) GetWindowCloseTime(ctx context.Context, orgID int, campaignID *int) (time.Time, error) {
	window, err := w.getEffectiveWindow(ctx, orgID, campaignID)
	if err != nil {
		return time.Time{}, err
	}

	now := time.Now()
	if !w.isTimeWithinWindow(now, window) {
		return time.Time{}, nil
	}

	return w.calculateWindowClose(now, window), nil
}

// calculateWindowClose calculates when the current window will close
func (w *SendWindowManager) calculateWindowClose(from time.Time, window *SendWindow) time.Time {
	loc, err := time.LoadLocation(window.Timezone)
	if err != nil {
		loc = time.UTC
	}

	localTime := from.In(loc)
	currentHour := localTime.Hour()

	// Handle normal window (e.g., 8-21)
	if window.StartHour < window.EndHour {
		return time.Date(
			localTime.Year(), localTime.Month(), localTime.Day(),
			window.EndHour, 0, 0, 0, loc,
		)
	}

	// Handle overnight window (e.g., 22-6)
	if window.StartHour > window.EndHour {
		if currentHour >= window.StartHour {
			// Window closes tomorrow at EndHour
			tomorrow := localTime.AddDate(0, 0, 1)
			return time.Date(
				tomorrow.Year(), tomorrow.Month(), tomorrow.Day(),
				window.EndHour, 0, 0, 0, loc,
			)
		}
		// Window closes today at EndHour
		return time.Date(
			localTime.Year(), localTime.Month(), localTime.Day(),
			window.EndHour, 0, 0, 0, loc,
		)
	}

	// 24-hour window never closes, return far future
	return from.AddDate(100, 0, 0)
}

// GetEffectiveWindowInfo returns the effective window configuration for debugging/display
func (w *SendWindowManager) GetEffectiveWindowInfo(ctx context.Context, orgID int, campaignID *int) (*SendWindow, error) {
	return w.getEffectiveWindow(ctx, orgID, campaignID)
}
