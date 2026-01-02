package core

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// Pause reason constants for campaign status updates
const (
	PauseReasonCooldown       = "cooldown"
	PauseReasonCircuitBreaker = "circuit_breaker"
	PauseReasonOutsideWindow  = "outside_window"
	PauseReasonNoDevices      = "no_devices"
)

// DispatchConfig holds configuration for the dispatcher service
type DispatchConfig struct {
	BatchSize              int           // Messages to fetch per cycle (default: 50)
	TickInterval           time.Duration // How often to check for messages (default: 1s)
	DefaultThrottleRate    time.Duration // Min delay between sends per device (default: 3s)
	DefaultSendWindowStart int           // Hour in 24h format (default: 8)
	DefaultSendWindowEnd   int           // Hour in 24h format (default: 21)
}

// DefaultDispatchConfig returns the default configuration
func DefaultDispatchConfig() DispatchConfig {
	return DispatchConfig{
		BatchSize:              50,
		TickInterval:           1 * time.Second,
		DefaultThrottleRate:    3 * time.Second,
		DefaultSendWindowStart: 8,
		DefaultSendWindowEnd:   21,
	}
}

// DispatcherService is the central orchestrator that processes pending messages from the queue
type DispatcherService struct {
	store          *store.Store
	messageService *MessageService
	devicePool     *DevicePoolManager
	windowManager  *SendWindowManager
	alertService   *AlertService
	config         DispatchConfig

	// Lifecycle management
	running    bool
	cancelFunc context.CancelFunc
	wg         sync.WaitGroup
	mu         sync.Mutex
}

// NewDispatcherService creates a new DispatcherService instance
func NewDispatcherService(
	store *store.Store,
	messageService *MessageService,
	devicePool *DevicePoolManager,
	windowManager *SendWindowManager,
	alertService *AlertService,
	config DispatchConfig,
) *DispatcherService {
	// Apply defaults for zero values
	if config.BatchSize <= 0 {
		config.BatchSize = 50
	}
	if config.TickInterval <= 0 {
		config.TickInterval = 1 * time.Second
	}
	if config.DefaultThrottleRate <= 0 {
		config.DefaultThrottleRate = 3 * time.Second
	}
	if config.DefaultSendWindowStart <= 0 {
		config.DefaultSendWindowStart = 8
	}
	if config.DefaultSendWindowEnd <= 0 {
		config.DefaultSendWindowEnd = 21
	}

	return &DispatcherService{
		store:          store,
		messageService: messageService,
		devicePool:     devicePool,
		windowManager:  windowManager,
		alertService:   alertService,
		config:         config,
	}
}

// Start begins the ticker-based processing loop
// It runs in a background goroutine and processes batches of queued messages
func (d *DispatcherService) Start(ctx context.Context) {
	d.mu.Lock()
	if d.running {
		d.mu.Unlock()
		return
	}
	d.running = true

	// Create a cancellable context for the dispatcher
	dispatchCtx, cancel := context.WithCancel(ctx)
	d.cancelFunc = cancel
	d.mu.Unlock()

	d.wg.Add(1)
	go func() {
		defer d.wg.Done()
		d.run(dispatchCtx)
	}()

	log.Printf("DispatcherService started with batch_size=%d, tick_interval=%v", d.config.BatchSize, d.config.TickInterval)
}

// Stop gracefully shuts down the dispatcher
// It waits for the current batch to complete before returning
func (d *DispatcherService) Stop() {
	d.mu.Lock()
	if !d.running {
		d.mu.Unlock()
		return
	}
	d.running = false

	if d.cancelFunc != nil {
		d.cancelFunc()
	}
	d.mu.Unlock()

	// Wait for the processing goroutine to finish
	d.wg.Wait()
	log.Println("DispatcherService stopped")
}

// IsRunning returns whether the dispatcher is currently running
func (d *DispatcherService) IsRunning() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.running
}

// run is the main processing loop
func (d *DispatcherService) run(ctx context.Context) {
	ticker := time.NewTicker(d.config.TickInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("DispatcherService: context cancelled, stopping")
			return
		case <-ticker.C:
			if err := d.ProcessBatch(ctx); err != nil {
				log.Printf("DispatcherService: error processing batch: %v", err)
			}
		}
	}
}

// ProcessBatch fetches and processes a batch of queued messages
// For each message: check send window, get available device, dispatch
func (d *DispatcherService) ProcessBatch(ctx context.Context) error {
	// Fetch batch of queued messages ordered by priority, created_at
	messages, err := d.store.GetQueuedMessages(ctx, d.config.BatchSize)
	if err != nil {
		return fmt.Errorf("failed to fetch queued messages: %w", err)
	}

	if len(messages) == 0 {
		return nil
	}

	// Track campaigns that need status updates
	campaignUpdates := make(map[int]string) // campaignID -> pause_reason

	for i := range messages {
		msg := &messages[i]

		// Check send window for this message's organization
		withinWindow, err := d.windowManager.IsWithinWindow(ctx, msg.OrganizationID, msg.CampaignID)
		if err != nil {
			log.Printf("DispatcherService: error checking send window for msg %d: %v", msg.ID, err)
			continue
		}

		if !withinWindow {
			// Outside send window - track for campaign update
			if msg.CampaignID != nil {
				campaignUpdates[*msg.CampaignID] = PauseReasonOutsideWindow
			}
			continue
		}

		// Get available device for this message
		device, err := d.devicePool.GetNextAvailableDevice(ctx, msg.OrganizationID, msg.RequiredTags)
		if err != nil {
			log.Printf("DispatcherService: error getting device for msg %d: %v", msg.ID, err)
			continue
		}

		if device == nil {
			// No device available - determine reason and track for campaign update
			if msg.CampaignID != nil {
				reason := d.determineNoDeviceReason(ctx, msg.OrganizationID)
				campaignUpdates[*msg.CampaignID] = reason
			}
			continue
		}

		// Dispatch the message
		if err := d.dispatchMessage(ctx, msg, device); err != nil {
			log.Printf("DispatcherService: error dispatching msg %d: %v", msg.ID, err)
			// Record failure for circuit breaker
			d.devicePool.RecordFailure(device.ID)
			continue
		}

		// Record successful send for throttling
		d.devicePool.RecordSend(device.ID)
		d.devicePool.RecordSuccess(device.ID)
	}

	// Update campaign statuses
	for campaignID, reason := range campaignUpdates {
		if err := d.updateCampaignPauseReason(ctx, campaignID, reason); err != nil {
			log.Printf("DispatcherService: error updating campaign %d pause reason: %v", campaignID, err)
		}
	}

	// Check for campaign completions
	if err := d.checkCampaignCompletions(ctx); err != nil {
		log.Printf("DispatcherService: error checking campaign completions: %v", err)
	}

	return nil
}

// dispatchMessage assigns a device to the message and triggers notification
func (d *DispatcherService) dispatchMessage(ctx context.Context, msg *model.Message, device *model.Device) error {
	// Update message with device assignment and change status to pending
	if err := d.store.UpdateMessageDeviceAndStatus(ctx, msg.ID, device.ID, model.MessageStatusPending); err != nil {
		return fmt.Errorf("failed to update message device: %w", err)
	}

	msg.DeviceID = &device.ID
	msg.Status = model.MessageStatusPending

	// Trigger FCM notification to device
	if err := d.messageService.NotifyDevice(ctx, msg); err != nil {
		return fmt.Errorf("failed to notify device: %w", err)
	}

	return nil
}

// determineNoDeviceReason checks why no device is available
func (d *DispatcherService) determineNoDeviceReason(ctx context.Context, orgID int) string {
	devices, err := d.store.GetDevicesByOrganizationID(ctx, orgID)
	if err != nil || len(devices) == 0 {
		return PauseReasonNoDevices
	}

	// Check each device's status
	allInCooldown := true
	allSuspended := true
	anyOnline := false

	for _, device := range devices {
		if device.Status == "online" {
			anyOnline = true
		}
		if !d.devicePool.IsInCooldown(device.ID) {
			allInCooldown = false
		}
		if !d.devicePool.IsDeviceSuspended(device.ID) {
			allSuspended = false
		}
	}

	if !anyOnline {
		return PauseReasonNoDevices
	}
	if allSuspended {
		return PauseReasonCircuitBreaker
	}
	if allInCooldown {
		return PauseReasonCooldown
	}

	return PauseReasonNoDevices
}

// updateCampaignPauseReason updates the pause reason for a campaign
func (d *DispatcherService) updateCampaignPauseReason(ctx context.Context, campaignID int, reason string) error {
	return d.store.UpdateCampaignPauseReason(ctx, campaignID, reason)
}

// checkCampaignCompletions checks if any processing campaigns have completed
func (d *DispatcherService) checkCampaignCompletions(ctx context.Context) error {
	// Get all campaigns in processing status
	campaigns, err := d.store.GetProcessingCampaigns(ctx)
	if err != nil {
		return fmt.Errorf("failed to get processing campaigns: %w", err)
	}

	for _, campaign := range campaigns {
		// Get message stats for this campaign
		stats, err := d.store.GetCampaignMessageStats(ctx, campaign.ID)
		if err != nil {
			log.Printf("DispatcherService: error getting stats for campaign %d: %v", campaign.ID, err)
			continue
		}

		// Check if all messages have reached terminal status
		if stats.Queued == 0 && stats.Pending == 0 {
			// All messages are in terminal state (sent, delivered, or failed)
			if err := d.store.UpdateCampaignStatus(ctx, campaign.ID, model.CampaignStatusCompleted); err != nil {
				log.Printf("DispatcherService: error completing campaign %d: %v", campaign.ID, err)
				continue
			}

			// Update final stats
			if err := d.store.UpdateCampaignFinalStats(ctx, campaign.ID, stats.Sent+stats.Delivered, stats.Failed); err != nil {
				log.Printf("DispatcherService: error updating final stats for campaign %d: %v", campaign.ID, err)
			}

			log.Printf("DispatcherService: campaign %d completed (sent=%d, failed=%d)", campaign.ID, stats.Sent+stats.Delivered, stats.Failed)
		} else {
			// Update estimated completion time
			if err := d.updateEstimatedCompletion(ctx, &campaign, stats); err != nil {
				log.Printf("DispatcherService: error updating estimated completion for campaign %d: %v", campaign.ID, err)
			}
		}
	}

	return nil
}

// updateEstimatedCompletion calculates and updates the estimated completion time
func (d *DispatcherService) updateEstimatedCompletion(ctx context.Context, campaign *model.Campaign, stats *store.CampaignMessageStats) error {
	// Calculate throughput based on recent sends
	// For simplicity, use the configured throttle rate and number of available devices
	org, err := d.store.GetOrganizationByID(ctx, campaign.OrganizationID)
	if err != nil {
		return err
	}

	throttleRate := org.SMSThrottleRateSeconds
	if throttleRate <= 0 {
		throttleRate = DefaultThrottleRateSeconds
	}

	// Get number of online devices
	devices, err := d.store.GetDevicesByOrganizationID(ctx, campaign.OrganizationID)
	if err != nil {
		return err
	}

	onlineDevices := 0
	for _, d := range devices {
		if d.Status == "online" {
			onlineDevices++
		}
	}

	if onlineDevices == 0 {
		// Can't estimate without devices
		return nil
	}

	// Calculate remaining messages and estimated time
	remaining := stats.Queued + stats.Pending
	if remaining == 0 {
		return nil
	}

	// Messages per second = onlineDevices / throttleRate
	// Time to complete = remaining * throttleRate / onlineDevices
	secondsToComplete := float64(remaining) * float64(throttleRate) / float64(onlineDevices)
	estimatedCompletion := time.Now().Add(time.Duration(secondsToComplete) * time.Second)

	return d.store.UpdateCampaignEstimatedCompletion(ctx, campaign.ID, estimatedCompletion)
}

// NotifyAllDevicesUnavailable sends an alert when all devices are unavailable
func (d *DispatcherService) NotifyAllDevicesUnavailable(ctx context.Context, orgID int, campaignID int) {
	title := "Campaign Paused - No Devices Available"
	message := fmt.Sprintf("Campaign %d has been paused because all devices are unavailable (offline, in cooldown, or suspended by circuit breaker).", campaignID)
	d.alertService.NotifyOrganization(ctx, orgID, "campaign_paused", title, message, "warning")
}
