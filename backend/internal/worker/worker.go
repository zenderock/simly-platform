package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hibiken/asynq"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// RateLimitError is a custom error that specifies when to retry
type RateLimitError struct {
	RetryIn time.Duration
	Msg     string
}

func (e *RateLimitError) Error() string {
	return e.Msg
}

// RedisWorker handles background task processing
type RedisWorker struct {
	server         *asynq.Server
	store          *store.Store
	messageService *core.MessageService
	devicePool     *core.DevicePoolManager
	windowManager  *core.SendWindowManager
	client         *asynq.Client
}

// NewRedisWorker creates a new RedisWorker instance
func NewRedisWorker(
	redisOpt asynq.RedisClientOpt,
	store *store.Store,
	messageService *core.MessageService,
	devicePool *core.DevicePoolManager,
	windowManager *core.SendWindowManager,
	client *asynq.Client,
) *RedisWorker {
	server := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				log.Printf("Task failed: %v type=%q payload=%v", err, task.Type(), task.Payload())
			}),
			RetryDelayFunc: func(n int, err error, task *asynq.Task) time.Duration {
				// Check for custom RateLimitError
				if rle, ok := err.(*RateLimitError); ok {
					return rle.RetryIn
				}
				// Default exponential backoff
				return asynq.DefaultRetryDelayFunc(n, err, task)
			},
		},
	)

	return &RedisWorker{
		server:         server,
		store:          store,
		messageService: messageService,
		devicePool:     devicePool,
		windowManager:  windowManager,
		client:         client,
	}
}

// Start runs the worker server
func (w *RedisWorker) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(core.TypeSMSDelivery, w.HandleSMSDeliveryTask)
	mux.HandleFunc(core.TypeCampaignIngest, w.HandleCampaignIngestion)

	log.Println("Redis Worker started processing tasks...")
	return w.server.Run(mux)
}

// Stop stops the worker server
func (w *RedisWorker) Stop() {
	w.server.Stop()
	w.server.Shutdown()
}

// HandleSMSDeliveryTask processes an SMS delivery task
func (w *RedisWorker) HandleSMSDeliveryTask(ctx context.Context, t *asynq.Task) error {
	var payload core.SMSDeliveryPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	msgID := payload.MessageID
	log.Printf("[Worker] Processing SMS Delivery for MessageID: %d", msgID)

	// Fetch message
	msg, err := w.store.GetMessageByID(ctx, msgID)
	if err != nil {
		return fmt.Errorf("failed to get message: %w", err)
	}

	// Check if message is already in a terminal state (avoid double processing)
	if msg.Status == model.MessageStatusSent || msg.Status == model.MessageStatusFailed {
		log.Printf("[Worker] Message %d already in terminal state: %s", msgID, msg.Status)
		return nil
	}

	// Check send window
	withinWindow, err := w.windowManager.IsWithinWindow(ctx, msg.OrganizationID, msg.CampaignID)
	if err != nil {
		return fmt.Errorf("failed to check send window: %w", err)
	}

	if !withinWindow {
		// Calculate time until next window
		nextOpen, err := w.windowManager.GetNextWindowOpen(ctx, msg.OrganizationID, msg.CampaignID)
		if err == nil {
			delay := time.Until(nextOpen)
			if delay < 0 {
				delay = 1 * time.Minute // Safe fallback
			}
			log.Printf("[Worker] Outside send window. Retrying in %v (at %v)", delay, nextOpen)
			return &RateLimitError{
				RetryIn: delay,
				Msg:     fmt.Sprintf("outside send window, retrying at %v", nextOpen),
			}
		}

		// Fallback to default backoff if calculation fails
		return fmt.Errorf("outside send window, retrying later")
	}

	// Get available device
	device, err := w.devicePool.GetNextAvailableDevice(ctx, msg.OrganizationID, msg.RequiredTags)
	if err != nil {
		return fmt.Errorf("failed to get device: %w", err)
	}

	if device == nil {
		// No device available, retry later
		return fmt.Errorf("no device available, retrying")
	}

	// Dispatch
	if err := w.dispatchMessage(ctx, msg, device); err != nil {
		// Record failure
		w.devicePool.RecordFailure(device.ID)
		return fmt.Errorf("dispatch failed: %w", err)
	}

	// Success
	w.devicePool.RecordSend(device.ID)
	w.devicePool.RecordSuccess(device.ID)

	log.Printf("[Worker] Successfully dispatched Message %d to Device %d", msgID, device.ID)
	return nil
}

func (w *RedisWorker) dispatchMessage(ctx context.Context, msg *model.Message, device *model.Device) error {
	// Update message with device assignment and change status to pending
	if err := w.store.UpdateMessageDeviceAndStatus(ctx, msg.ID, device.ID, model.MessageStatusPending); err != nil {
		return fmt.Errorf("failed to update message device: %w", err)
	}

	// Notify via MessageService (uses FCM)
	msg.DeviceID = &device.ID
	msg.Status = model.MessageStatusPending

	if err := w.messageService.NotifyDevice(ctx, msg); err != nil {
		return fmt.Errorf("failed to notify device: %w", err)
	}

	return nil
}
