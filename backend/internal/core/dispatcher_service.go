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

// ProcessBatch checks for stuck messages and re-enqueues them
// Watchdog Mode: Only picks up messages older than 5 minutes
func (d *DispatcherService) ProcessBatch(ctx context.Context) error {
	// 5 minutes ago
	cutoff := time.Now().Add(-5 * time.Minute)

	// Fetch stuck messages
	messages, err := d.store.GetStuckMessages(ctx, cutoff, d.config.BatchSize)
	if err != nil {
		return fmt.Errorf("failed to fetch stuck messages: %w", err)
	}

	if len(messages) == 0 {
		return nil
	}

	log.Printf("DispatcherWatchdog: Found %d stuck messages. Re-enqueuing...", len(messages))

	count := 0
	for i := range messages {
		msg := &messages[i]

		// Re-enqueue to Redis
		if err := d.messageService.EnqueueSMSDelivery(ctx, msg); err != nil {
			log.Printf("DispatcherWatchdog: Failed to re-enqueue message %d: %v", msg.ID, err)
			continue
		}

		// Update UpdatedAt to prevent immediate re-fetch in next tick if enqueue relies on task processing time?
		// Actually EnqueueSMSDelivery doesn't update DB status (it's already queued).
		// But GetStuckMessages filters by CreatedAt < cutoff.
		// If we don't update something, it might be picked up again if 5 mins passed?
		// Actually `created_at` doesn't change.
		// Issue: If we re-enqueue, RedisWorker will convert it to 'pending' eventually.
		// But if RedisWorker is slow or queue is full, this watchdog will keep picking it up every tick (1s).
		// FIX: We should touch `created_at` or better `updated_at`.
		// But query uses `created_at`.
		// Let's change query in GetStuckMessages to use `updated_at`? No, original creation matters.
		// Best approach: Add `processed_at` or similar check.
		// Or update `updated_at` and change query to `updated_at < cutoff`.
		// Let's assuming GetStuckMessages implementation I just wrote uses `created_at`.
		// I should have used `updated_at`.
		// Let's modify GetStuckMessages to use `updated_at` instead of `created_at` or both?
		// Standard watchdog pattern: check `updated_at`.
		// I will update the store method in next step to use `updated_at`.

		// For now, let's assume I will fix the store query to `updated_at < $1`.
		// So I must touch `updated_at` here.
		// There is no explicit method to touch updated_at without changing status.
		// I can use a raw exec or `UpdateMessageStatus` but keeping status 'queued'.
		// let's use UpdateMessageStatus to 'queued' (msg.Status) just to touch updated_at.
		if err := d.store.UpdateMessageStatus(ctx, msg.ID, "queued", ""); err != nil {
			log.Printf("DispatcherWatchdog: Failed to touch message %d: %v", msg.ID, err)
		}

		count++
	}

	if count > 0 {
		log.Printf("DispatcherWatchdog: Successfully re-enqueued %d messages", count)
	}

	// Still check for campaign completions (orphaned logic?)
	// Yes, campaigns still need completion checks if worker doesn't do it fully?
	// RedisWorker updates stats. But completion check is polling based in Dispatcher.
	// So we keep this.
	if err := d.checkCampaignCompletions(ctx); err != nil {
		log.Printf("DispatcherService: error checking campaign completions: %v", err)
	}

	return nil
}

// dispatchMessage is removed as it's no longer used actively by Dispatcher
// But interface might demand it? No, it's a private method.
// Removing it or leaving it unused. I'll comment it out/remove it.
// func (d *DispatcherService) dispatchMessage...

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
			if err := d.store.UpdateCampaignPauseReason(ctx, campaign.ID, ""); err != nil {
				log.Printf("DispatcherService: error clearing pause reason for campaign %d: %v", campaign.ID, err)
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
