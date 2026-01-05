package core

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// Constants for throttling and circuit breaker
const (
	DefaultThrottleRateSeconds = 3
	CooldownThreshold          = 100 // Messages per 10-minute window
	CooldownWindowDuration     = 10 * time.Minute
	CooldownPeriod             = 5 * time.Minute
	CircuitBreakerThreshold    = 5 // Consecutive failures to open circuit
	CircuitBreakerSuspension   = 2 * time.Minute
)

// Errors
var (
	ErrDailyQuotaReached = errors.New("daily quota reached")
)

// DeviceThrottleState tracks throttling state for a single device
type DeviceThrottleState struct {
	LastSendTime   time.Time  // Last time a message was sent via this device
	SendCount10Min int        // Messages sent in current 10-minute window
	WindowStart    time.Time  // Start of current 10-minute window
	CooldownUntil  *time.Time // If set, device is in cooldown until this time
}

// CircuitBreakerState tracks failure state for circuit breaker pattern
type CircuitBreakerState struct {
	ConsecutiveFailures int        // Number of consecutive send failures
	SuspendedUntil      *time.Time // If set, device is suspended until this time
	LastFailureTime     time.Time  // Time of last failure
}

// DevicePoolManager manages device state, throttling, and selection
type DevicePoolManager struct {
	store           *store.Store
	throttleState   map[int]*DeviceThrottleState // key: deviceID
	circuitBreaker  map[int]*CircuitBreakerState // key: deviceID
	lastDeviceIndex map[int]int                  // key: orgID, value: last used device index for round-robin
	mu              sync.RWMutex
}

// NewDevicePoolManager creates a new DevicePoolManager instance
func NewDevicePoolManager(store *store.Store) *DevicePoolManager {
	return &DevicePoolManager{
		store:           store,
		throttleState:   make(map[int]*DeviceThrottleState),
		circuitBreaker:  make(map[int]*CircuitBreakerState),
		lastDeviceIndex: make(map[int]int),
	}
}

// getOrCreateThrottleState returns the throttle state for a device, creating if needed
func (p *DevicePoolManager) getOrCreateThrottleState(deviceID int) *DeviceThrottleState {
	if state, exists := p.throttleState[deviceID]; exists {
		return state
	}
	state := &DeviceThrottleState{
		WindowStart: time.Now(),
	}
	p.throttleState[deviceID] = state
	return state
}

// getOrCreateCircuitBreakerState returns the circuit breaker state for a device, creating if needed
func (p *DevicePoolManager) getOrCreateCircuitBreakerState(deviceID int) *CircuitBreakerState {
	if state, exists := p.circuitBreaker[deviceID]; exists {
		return state
	}
	state := &CircuitBreakerState{}
	p.circuitBreaker[deviceID] = state
	return state
}

// RecordSend updates throttle state after a successful send
func (p *DevicePoolManager) RecordSend(deviceID int) {
	p.mu.Lock()
	defer p.mu.Unlock()

	state := p.getOrCreateThrottleState(deviceID)
	now := time.Now()

	// Check if we need to reset the 10-minute window
	if now.Sub(state.WindowStart) >= CooldownWindowDuration {
		state.WindowStart = now
		state.SendCount10Min = 0
	}

	state.LastSendTime = now
	state.SendCount10Min++

	// Check if cooldown should be triggered (100 messages in 10-min window)
	if state.SendCount10Min >= CooldownThreshold {
		cooldownEnd := now.Add(CooldownPeriod)
		state.CooldownUntil = &cooldownEnd
		// Reset counter for next window after cooldown
		state.SendCount10Min = 0
		state.WindowStart = cooldownEnd
	}
}

// GetDeviceDelay returns the remaining delay before next send is allowed
func (p *DevicePoolManager) GetDeviceDelay(deviceID int, throttleRateSeconds int) time.Duration {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.throttleState[deviceID]
	if !exists {
		return 0
	}

	// Use provided throttle rate or default
	if throttleRateSeconds <= 0 {
		throttleRateSeconds = DefaultThrottleRateSeconds
	}
	throttleRate := time.Duration(throttleRateSeconds) * time.Second

	now := time.Now()

	// Check if in cooldown
	if state.CooldownUntil != nil && now.Before(*state.CooldownUntil) {
		return state.CooldownUntil.Sub(now)
	}

	// Calculate remaining throttle delay
	elapsed := now.Sub(state.LastSendTime)
	if elapsed < throttleRate {
		return throttleRate - elapsed
	}

	return 0
}

// IsInCooldown checks if a device is currently in cooldown period
func (p *DevicePoolManager) IsInCooldown(deviceID int) bool {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.throttleState[deviceID]
	if !exists {
		return false
	}

	if state.CooldownUntil == nil {
		return false
	}

	return time.Now().Before(*state.CooldownUntil)
}

// GetCooldownRemaining returns the remaining cooldown time for a device
func (p *DevicePoolManager) GetCooldownRemaining(deviceID int) time.Duration {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.throttleState[deviceID]
	if !exists || state.CooldownUntil == nil {
		return 0
	}

	remaining := time.Until(*state.CooldownUntil)
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetSendCount10Min returns the current send count in the 10-minute window
func (p *DevicePoolManager) GetSendCount10Min(deviceID int) int {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.throttleState[deviceID]
	if !exists {
		return 0
	}

	// Check if window has expired
	if time.Since(state.WindowStart) >= CooldownWindowDuration {
		return 0
	}

	return state.SendCount10Min
}

// RecordFailure increments failure counter and opens circuit if threshold reached
// Returns true if circuit was opened (device suspended)
func (p *DevicePoolManager) RecordFailure(deviceID int) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	state := p.getOrCreateCircuitBreakerState(deviceID)
	now := time.Now()

	state.ConsecutiveFailures++
	state.LastFailureTime = now

	// Check if circuit should open
	if state.ConsecutiveFailures >= CircuitBreakerThreshold {
		suspendedUntil := now.Add(CircuitBreakerSuspension)
		state.SuspendedUntil = &suspendedUntil
		return true
	}

	return false
}

// RecordSuccess resets the failure counter after a successful send
func (p *DevicePoolManager) RecordSuccess(deviceID int) {
	p.mu.Lock()
	defer p.mu.Unlock()

	state := p.getOrCreateCircuitBreakerState(deviceID)
	state.ConsecutiveFailures = 0
	state.SuspendedUntil = nil
}

// IsDeviceSuspended checks if a device is suspended by circuit breaker
func (p *DevicePoolManager) IsDeviceSuspended(deviceID int) bool {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.circuitBreaker[deviceID]
	if !exists {
		return false
	}

	if state.SuspendedUntil == nil {
		return false
	}

	return time.Now().Before(*state.SuspendedUntil)
}

// GetSuspensionRemaining returns the remaining suspension time for a device
func (p *DevicePoolManager) GetSuspensionRemaining(deviceID int) time.Duration {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.circuitBreaker[deviceID]
	if !exists || state.SuspendedUntil == nil {
		return 0
	}

	remaining := time.Until(*state.SuspendedUntil)
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetConsecutiveFailures returns the current consecutive failure count
func (p *DevicePoolManager) GetConsecutiveFailures(deviceID int) int {
	p.mu.RLock()
	defer p.mu.RUnlock()

	state, exists := p.circuitBreaker[deviceID]
	if !exists {
		return 0
	}

	return state.ConsecutiveFailures
}

// IsDeviceAvailable checks if a device is available for sending
// A device is unavailable if it's in cooldown, suspended, or has pending throttle delay
func (p *DevicePoolManager) IsDeviceAvailable(deviceID int, throttleRateSeconds int) bool {
	// Check cooldown
	if p.IsInCooldown(deviceID) {
		return false
	}

	// Check circuit breaker suspension
	if p.IsDeviceSuspended(deviceID) {
		return false
	}

	// Check throttle delay
	if p.GetDeviceDelay(deviceID, throttleRateSeconds) > 0 {
		return false
	}

	return true
}

// GetNextAvailableDevice selects the next available device and SIM slot using round-robin
func (p *DevicePoolManager) GetNextAvailableDevice(ctx context.Context, orgID int, requiredTags []string) (*model.Device, int, error) {
	// Get all devices for the organization
	devices, err := p.store.GetDevicesByOrganizationID(ctx, orgID)
	if err != nil {
		return nil, -1, err
	}

	if len(devices) == 0 {
		return nil, -1, nil
	}

	// Get organization throttle rate
	org, err := p.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, -1, err
	}
	throttleRate := org.SMSThrottleRateSeconds
	if throttleRate <= 0 {
		throttleRate = DefaultThrottleRateSeconds
	}

	// Filter to online devices with matching tags
	var candidates []model.Device
	for _, d := range devices {
		if d.Status != "online" {
			continue
		}
		if len(requiredTags) > 0 && !hasAllTagsForPool(d.Tags, requiredTags) {
			continue
		}
		candidates = append(candidates, d)
	}

	if len(candidates) == 0 {
		return nil, -1, nil
	}

	// Get last used index for this org
	p.mu.Lock()
	lastIndex := p.lastDeviceIndex[orgID]
	p.mu.Unlock()

	// Round-robin: try each device starting from lastIndex + 1
	n := len(candidates)
	devicesWithLimitReached := 0

	for i := 0; i < n; i++ {
		idx := (lastIndex + 1 + i) % n
		device := candidates[idx]

		if p.IsDeviceAvailable(device.ID, throttleRate) {
			// Iterate through SIM cards to find one that has not reached its daily limit
			validSlot := -1
			allSimsLimitReached := true

			for _, sim := range device.SimCards {
				if !sim.IsActive {
					continue
				}

				// Check daily limit for this SIM
				limitReached := false
				if sim.DailyLimit > 0 {
					today := time.Now().UTC().Truncate(24 * time.Hour)
					lastReset := time.Time{}
					if sim.LastResetDate != nil {
						lastReset = sim.LastResetDate.UTC().Truncate(24 * time.Hour)
					}

					if lastReset.Equal(today) {
						if sim.SentToday >= sim.DailyLimit {
							limitReached = true
						}
					}
					// If lastReset < today, effectively SentToday is 0, so allowed
				}

				if !limitReached {
					allSimsLimitReached = false
					validSlot = sim.SlotIndex
					break // Found a usable SIM
				}
			}

			if validSlot != -1 {
				// Update last used index
				p.mu.Lock()
				p.lastDeviceIndex[orgID] = idx
				p.mu.Unlock()

				return &device, validSlot, nil
			}

			if allSimsLimitReached && len(device.SimCards) > 0 {
				devicesWithLimitReached++
			}
		}
	}

	// No available device found
	// If we found devices but all matched SIMs were at limit, return specific error
	if len(candidates) > 0 && devicesWithLimitReached > 0 { // Simplistic check - strict would track if *every* candidate failed due to limit
		// We should probably verify if *all* viable candidates failed due to limit
		// But for now, if we found NO valid slot and we saw at least one limit reached, it's a hint.
		// Let's refine: If we iterate all candidates and find none, but some were skipped due to limit.
		// Actually, simpler: if we exit the loop without return, check if we saw limits.
		return nil, -1, ErrDailyQuotaReached
	}

	return nil, -1, nil
}

// GetAllDevicesStatus returns availability status for all devices in an organization
// Useful for debugging and monitoring
func (p *DevicePoolManager) GetAllDevicesStatus(ctx context.Context, orgID int) ([]DeviceStatus, error) {
	devices, err := p.store.GetDevicesByOrganizationID(ctx, orgID)
	if err != nil {
		return nil, err
	}

	org, err := p.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	throttleRate := org.SMSThrottleRateSeconds
	if throttleRate <= 0 {
		throttleRate = DefaultThrottleRateSeconds
	}

	var statuses []DeviceStatus
	for _, d := range devices {
		status := DeviceStatus{
			DeviceID:            d.ID,
			DeviceName:          d.Name,
			Online:              d.Status == "online",
			InCooldown:          p.IsInCooldown(d.ID),
			CooldownRemaining:   p.GetCooldownRemaining(d.ID),
			Suspended:           p.IsDeviceSuspended(d.ID),
			SuspensionRemaining: p.GetSuspensionRemaining(d.ID),
			ThrottleDelay:       p.GetDeviceDelay(d.ID, throttleRate),
			SendCount10Min:      p.GetSendCount10Min(d.ID),
			ConsecutiveFailures: p.GetConsecutiveFailures(d.ID),
			Available:           d.Status == "online" && p.IsDeviceAvailable(d.ID, throttleRate),
		}
		statuses = append(statuses, status)
	}

	return statuses, nil
}

// DeviceStatus represents the current status of a device for monitoring
type DeviceStatus struct {
	DeviceID            int           `json:"device_id"`
	DeviceName          string        `json:"device_name"`
	Online              bool          `json:"online"`
	InCooldown          bool          `json:"in_cooldown"`
	CooldownRemaining   time.Duration `json:"cooldown_remaining"`
	Suspended           bool          `json:"suspended"`
	SuspensionRemaining time.Duration `json:"suspension_remaining"`
	ThrottleDelay       time.Duration `json:"throttle_delay"`
	SendCount10Min      int           `json:"send_count_10min"`
	ConsecutiveFailures int           `json:"consecutive_failures"`
	Available           bool          `json:"available"`
}

// hasAllTagsForPool checks if device has all required tags
func hasAllTagsForPool(deviceTags, requiredTags []string) bool {
	tagMap := make(map[string]bool)
	for _, t := range deviceTags {
		tagMap[t] = true
	}
	for _, req := range requiredTags {
		if !tagMap[req] {
			return false
		}
	}
	return true
}

// ResetDeviceState clears all state for a device (useful for testing)
func (p *DevicePoolManager) ResetDeviceState(deviceID int) {
	p.mu.Lock()
	defer p.mu.Unlock()

	delete(p.throttleState, deviceID)
	delete(p.circuitBreaker, deviceID)
}

// ResetAllState clears all state (useful for testing)
func (p *DevicePoolManager) ResetAllState() {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.throttleState = make(map[int]*DeviceThrottleState)
	p.circuitBreaker = make(map[int]*CircuitBreakerState)
	p.lastDeviceIndex = make(map[int]int)
}
