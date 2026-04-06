package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

const (
	TypeSMSDelivery = "sms:deliver"
)

// SMSDeliveryPayload is the payload for SMS delivery tasks
type SMSDeliveryPayload struct {
	MessageID int `json:"message_id"`
}

type MessageService struct {
	store                *store.Store
	webhook              *WebhookService
	notifications        NotificationProvider
	rateLimiter          *RateLimitService
	appService           *ApplicationService
	alertService         *AlertService
	devicePoolManager    *DevicePoolManager
	appDIDService        *AppDIDService
	taskClient           *asynq.Client
	sandboxSuccessNumber string
	sandboxFailureNumber string
}

func NewMessageService(
	store *store.Store,
	webhook *WebhookService,
	notifications NotificationProvider,
	rateLimiter *RateLimitService,
	appService *ApplicationService,
	sandboxSuccessNumber string,
	sandboxFailureNumber string,
	alertService *AlertService,
	devicePoolManager *DevicePoolManager,
	appDIDService *AppDIDService,
	taskClient *asynq.Client,
) *MessageService {
	return &MessageService{
		store:                store,
		webhook:              webhook,
		notifications:        notifications,
		rateLimiter:          rateLimiter,
		appService:           appService,
		alertService:         alertService,
		devicePoolManager:    devicePoolManager,
		appDIDService:        appDIDService,
		taskClient:           taskClient,
		sandboxSuccessNumber: sandboxSuccessNumber,
		sandboxFailureNumber: sandboxFailureNumber,
	}
}

func (s *MessageService) ReceiveSMS(ctx context.Context, orgID int, fromNumber string, toNumber string, body string, deviceID int) error {
	// Resolve application from DID if available - use destination number (toNumber) for routing
	var applicationID *int
	if s.appDIDService != nil {
		if resolvedAppID, err := s.appDIDService.ResolveApplicationFromDID(ctx, toNumber); err == nil && resolvedAppID != nil {
			applicationID = resolvedAppID
		}
	}

	msg := &model.Message{
		OrganizationID: orgID,
		ApplicationID:  applicationID, // Now properly resolved from DID
		DeviceID:       &deviceID,
		ToNumber:       toNumber,    // Destination SIM number
		FromNumber:     &fromNumber, // Sender's number
		Body:           body,
		Status:         "received",
		Direction:      "inbound",
		Priority:       "normal",
		RequiredTags:   []string{},
	}

	if err := s.store.CreateMessage(ctx, msg); err != nil {
		return err
	}

	// Automated Opt-Out / Opt-In Handling
	cleanBody := strings.TrimSpace(strings.ToUpper(body))
	optOutKeywords := []string{"STOP", "QUIT", "UNSUBSCRIBE", "CANCEL", "END"}
	optInKeywords := []string{"START", "YES", "JOIN", "OPTIN"}

	isOptOut := false
	for _, kw := range optOutKeywords {
		if cleanBody == kw {
			isOptOut = true
			break
		}
	}

	if isOptOut {
		_ = s.store.AddToBlacklist(ctx, orgID, fromNumber)
	} else {
		isOptIn := false
		for _, kw := range optInKeywords {
			if cleanBody == kw {
				isOptIn = true
				break
			}
		}
		if isOptIn {
			_ = s.store.RemoveFromBlacklist(ctx, orgID, fromNumber)
		}
	}

	// Dispatch webhook with resolved AppID
	s.webhook.DispatchEvent(orgID, applicationID, "message.received", msg)
	return nil
}

// selectBestDevice finds the best ONLINE device matching tags, optionally excluding one
func (s *MessageService) selectBestDevice(ctx context.Context, orgID int, requiredTags []string, excludeDeviceID *int) (*model.Device, error) {
	devices, err := s.store.GetDevicesByOrganizationID(ctx, orgID)
	if err != nil || len(devices) == 0 {
		return nil, errors.New("no gateways configured")
	}

	var candidates []model.Device
	for _, d := range devices {
		if d.Status == "online" {
			if excludeDeviceID != nil && d.ID == *excludeDeviceID {
				continue
			}
			candidates = append(candidates, d)
		}
	}

	if len(candidates) == 0 {
		return nil, errors.New("no online devices available (or all candidates excluded)")
	}

	// Filter by Tags if required
	var filtered []model.Device
	if len(requiredTags) > 0 {
		for _, d := range candidates {
			if hasAllTags(d.Tags, requiredTags) {
				filtered = append(filtered, d)
			}
		}
		if len(filtered) == 0 {
			return nil, fmt.Errorf("no online devices found matching tags: %v", requiredTags)
		}
	} else {
		filtered = candidates
	}

	// Intelligent Selection: Score devices based on Signal & Battery
	// Score = (Signal * 15) + (BatteryLevel / 2) -> Signal is more important
	var bestDevice *model.Device
	maxScore := -1

	for i := range filtered {
		score := (filtered[i].SignalStrength * 15) + (filtered[i].BatteryLevel / 2)
		if score > maxScore {
			maxScore = score
			bestDevice = &filtered[i]
		}
	}

	return bestDevice, nil
}

func hasAllTags(deviceTags, requiredTags []string) bool {
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

func (s *MessageService) SendSMS(ctx context.Context, orgID int, req model.SendMessageRequest) (*model.Message, error) {
	var targetDevice *model.Device
	var err error

	// 0. Fetch Org to check plan for Branding
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	// Append signature for free plan
	body := req.Body
	if org.Plan == model.PlanFree {
		signature := "\n\nSent via Simly"
		if !strings.HasSuffix(body, signature) {
			body += signature
		}
	}

	// Blacklist Check
	blacklisted, err := s.store.IsBlacklisted(ctx, orgID, req.To)
	if err != nil {
		return nil, fmt.Errorf("failed to check blacklist: %w", err)
	}
	if blacklisted {
		return nil, errors.New("cannot send message: recipient has opted out (STOP)")
	}

	// 1. Rate Limiting Check
	if req.ApplicationID != nil {
		if err := s.rateLimiter.AllowRequest(ctx, *req.ApplicationID, orgID); err != nil {
			return nil, err
		}

		// SANDBOX CHECK
		app, err := s.appService.GetApplication(ctx, *req.ApplicationID)
		if err == nil && app.IsSandbox {
			fakeStatus := "delivered"
			if req.To == s.sandboxFailureNumber {
				fakeStatus = "failed"
			}

			msg := &model.Message{
				OrganizationID: orgID,
				ApplicationID:  req.ApplicationID,
				ToNumber:       req.To,
				Body:           body,
				Status:         fakeStatus,
				Direction:      "outbound",
				Priority:       req.Priority,
				RequiredTags:   req.Tags,
			}
			if err := s.store.CreateMessage(ctx, msg); err != nil {
				return nil, err
			}

			// Record usage for billing
			if cost, err := s.rateLimiter.CalculateSMSCost(ctx, orgID); err == nil {
				_ = s.rateLimiter.RecordUsage(ctx, *req.ApplicationID, orgID, msg.ID, cost)
			}

			return msg, nil
		}
	}

	// 2. Pre-validate Device selection (if specific device requested)
	if req.DeviceID != nil {
		device, err := s.store.GetDeviceByID(ctx, *req.DeviceID)
		if err != nil {
			return nil, fmt.Errorf("device not found: %w", err)
		}
		if device.OrganizationID != orgID {
			return nil, errors.New("unauthorized: device does not belong to your organization")
		}
		targetDevice = device
	}

	// 3. Create Message Record
	msg := &model.Message{
		OrganizationID: orgID,
		ApplicationID:  req.ApplicationID,
		ToNumber:       req.To,
		Body:           body,
		Status:         "queued", // Always start as queued for Redis
		Direction:      "outbound",
		Priority:       req.Priority,
		RequiredTags:   req.Tags,
		ScheduledAt:    req.ScheduledAt,
		MaxRetries:     3, // Default retries
		SimSlot:        req.SimSlot,
	}

	// If scheduled for future, set status accordingly
	if req.ScheduledAt != nil && req.ScheduledAt.After(time.Now()) {
		msg.Status = "scheduled"
	}

	if targetDevice != nil {
		msg.DeviceID = &targetDevice.ID

		// Set from_number based on selected SIM slot
		if req.SimSlot != nil {
			for _, simCard := range targetDevice.SimCards {
				if simCard.SlotIndex == *req.SimSlot && simCard.PhoneNumber != "" {
					msg.FromNumber = &simCard.PhoneNumber
					break
				}
			}
		}
	}

	// Enforce Plan-based Priority (Automated)
	if org.Plan == model.PlanFree {
		msg.Priority = "low"
	} else if org.Plan == model.PlanAgency {
		msg.Priority = "high"
	} else {
		msg.Priority = "normal"
	}

	if msg.RequiredTags == nil {
		msg.RequiredTags = []string{}
	}

	if err := s.store.CreateMessage(ctx, msg); err != nil {
		return nil, err
	}

	// 3.5. Auto Save Contacts if enabled
	if org.AutoSaveContacts {
		contact := model.Contact{
			OrganizationID: orgID,
			FirstName:      "New",
			LastName:       "Contact",
			PhoneNumber:    req.To,
			Email:          "",
			Tags:           []string{"auto-saved"},
		}
		if req.ApplicationID != nil {
			contact.ApplicationID = req.ApplicationID
		}

		go func(c model.Contact) {
			err := s.store.AutoSaveContact(context.Background(), &c)
			if err != nil {
				log.Printf("Warning: failed to auto-save contact %s: %v", c.PhoneNumber, err)
			}
		}(contact)
	}

	// 4. Enqueue to Asynq (Redis)
	if s.taskClient != nil {
		if err := s.EnqueueSMSDelivery(ctx, msg); err != nil {
			log.Printf("Failed to enqueue message %d: %v", msg.ID, err)
			// Don't fail request, background dispatcher will need recover this
		}
	} else {
		log.Printf("Warning: taskClient is nil, message %d stuck in queued state", msg.ID)
	}

	return msg, nil
}

// EnqueueSMSDelivery queues a message for delivery via Asynq
func (s *MessageService) EnqueueSMSDelivery(ctx context.Context, msg *model.Message) error {
	payload, err := json.Marshal(SMSDeliveryPayload{MessageID: msg.ID})
	if err != nil {
		return err
	}

	// Determine queue priority
	queueName := "default"
	if msg.Priority == "high" {
		queueName = "critical" // Map high priority to critical queue
	} else if msg.Priority == "low" {
		queueName = "low"
	}

	opts := []asynq.Option{
		asynq.Queue(queueName),
		asynq.MaxRetry(msg.MaxRetries),
	}

	// ProcessAt for scheduled messages
	if msg.ScheduledAt != nil && msg.ScheduledAt.After(time.Now()) {
		opts = append(opts, asynq.ProcessAt(*msg.ScheduledAt))
	}

	task := asynq.NewTask(TypeSMSDelivery, payload, opts...)
	info, err := s.taskClient.Enqueue(task)
	if err != nil {
		return err
	}
	log.Printf("Enqueued task: %s, queue: %s", info.ID, info.Queue)
	return nil
}

func (s *MessageService) NotifyDevice(ctx context.Context, msg *model.Message) error {
	return s.NotifyDeviceWithExclusion(ctx, msg, nil)
}

func (s *MessageService) NotifyDeviceWithExclusion(ctx context.Context, msg *model.Message, excludeID *int) error {
	// If deviceID is missing, we need to find one now (Late Binding for Scheduled Messages or Failover)
	var device *model.Device
	var err error

	if msg.DeviceID != nil {
		device, err = s.store.GetDeviceByID(ctx, *msg.DeviceID)
	} else {
		// Use DevicePoolManager if available, otherwise fallback to old method
		if s.devicePoolManager != nil {
			var slotIndex int
			device, slotIndex, err = s.devicePoolManager.GetNextAvailableDevice(ctx, msg.OrganizationID, msg.RequiredTags)
			if err == nil && slotIndex != -1 {
				msg.SimSlot = &slotIndex
			}
		} else {
			device, err = s.selectBestDevice(ctx, msg.OrganizationID, msg.RequiredTags, excludeID)
		}

		if err == nil && device != nil {
			// Update message with selected device and slot
			if updateErr := s.store.UpdateMessageDeviceAndSlot(ctx, msg.ID, device.ID, msg.SimSlot); updateErr != nil {
				log.Printf("Warning: failed to update message %d with device %d: %v\n", msg.ID, device.ID, updateErr)
			} else {
				log.Printf("Message %d assigned to device %d (%s) slot %v\n", msg.ID, device.ID, device.Name, msg.SimSlot)
			}
			msg.DeviceID = &device.ID

			// Set from_number based on selected SIM slot if not already set
			if msg.FromNumber == nil && msg.SimSlot != nil {
				for _, simCard := range device.SimCards {
					if simCard.SlotIndex == *msg.SimSlot && simCard.PhoneNumber != "" {
						msg.FromNumber = &simCard.PhoneNumber
						// Update the message in database with from_number
						if updateErr := s.store.UpdateMessageFromNumber(ctx, msg.ID, simCard.PhoneNumber); updateErr != nil {
							log.Printf("Warning: failed to update message %d with from_number %s: %v\n", msg.ID, simCard.PhoneNumber, updateErr)
						}
						break
					}
				}
			}
		}
	}

	if err != nil {
		// Record failure in DevicePoolManager if device was specified
		if msg.DeviceID != nil && s.devicePoolManager != nil {
			s.devicePoolManager.RecordFailure(*msg.DeviceID)
		}
		return fmt.Errorf("failed to find device for notification: %w", err)
	}

	if device.FCMToken == "" {
		// Record failure in DevicePoolManager
		if s.devicePoolManager != nil {
			s.devicePoolManager.RecordFailure(device.ID)
		}
		return errors.New("device has no valid push token")
	}

	pushData := map[string]string{
		"message_id": fmt.Sprintf("%d", msg.ID),
		"to":         msg.ToNumber,
		"body":       msg.Body,
		"priority":   msg.Priority,
	}

	if msg.SimSlot != nil {
		pushData["sim_slot"] = fmt.Sprintf("%d", *msg.SimSlot)
	}

	// Send push notification
	pushErr := s.notifications.SendPush(ctx, device.FCMToken, "Action Required", "New SMS to send", pushData)

	// Record send event in DevicePoolManager
	if s.devicePoolManager != nil {
		if pushErr != nil {
			// Record failure
			s.devicePoolManager.RecordFailure(device.ID)
		} else {
			// Record successful send
			s.devicePoolManager.RecordSend(device.ID)
		}
	}

	return pushErr
}

func logNotificationError(msgID int, err error) {
	fmt.Printf("[ALERT] Push failed for message %d: %v\n", msgID, err)
}

func (s *MessageService) UpdateStatus(ctx context.Context, msgID int, status string, errorCode string, errorMessage string) error {
	// 1. Get Message info
	msg, err := s.store.GetMessageByID(ctx, msgID)
	if err != nil {
		return err
	}

	// 2. Record success/failure in DevicePoolManager
	if msg.DeviceID != nil && s.devicePoolManager != nil {
		if status == "sent" || status == "delivered" {
			// Record success - resets circuit breaker
			s.devicePoolManager.RecordSuccess(*msg.DeviceID)
		} else if status == "failed" {
			// Record failure - may trigger circuit breaker
			s.devicePoolManager.RecordFailure(*msg.DeviceID)
		}
	}

	// 3. Handle Retries for Failures
	if status == "failed" {
		if msg.RetryCount < msg.MaxRetries {
			newRetryCount := msg.RetryCount + 1
			log.Printf("Message %d failed, retrying (%d/%d) via Queue...\n", msgID, newRetryCount, msg.MaxRetries)

			// 1. Clear device assignment and increment retry in DB
			if err := s.store.UpdateMessageRetry(ctx, msgID, newRetryCount, "Last delivery attempt failed", "queued"); err != nil {
				return fmt.Errorf("failed to update message retry: %w", err)
			}

			// 2. Enqueue retry logic
			if s.taskClient != nil {
				// Update status in object
				msg.RetryCount = newRetryCount
				msg.Status = "queued"
				msg.DeviceID = nil // Reset device ID

				if err := s.EnqueueSMSDelivery(ctx, msg); err != nil {
					log.Printf("Failed to re-enqueue failed message %d: %v", msgID, err)
				}
			}
			return nil
		}
	}

	// 4. Update Status Normally (Success or Terminal Failure)
	fullError := ""
	if errorCode != "" {
		fullError = fmt.Sprintf("%s: %s", errorCode, errorMessage)
	} else if errorMessage != "" {
		fullError = errorMessage
	}

	if err := s.store.UpdateMessageStatus(ctx, msgID, status, fullError); err != nil {
		return err
	}

	// 5. Record Usage for billing when message is successfully sent
	if (status == "sent" || status == "delivered") && msg.ApplicationID != nil {
		if cost, err := s.rateLimiter.CalculateSMSCost(ctx, msg.OrganizationID); err == nil {
			_ = s.rateLimiter.RecordUsage(ctx, *msg.ApplicationID, msg.OrganizationID, msgID, cost)
		}
	}

	// Increment Campaign Stats if message belongs to a campaign
	if msg.CampaignID != nil {
		sentDelta := 0
		failedDelta := 0

		// Terminal states: sent, delivered, failed
		// Logic: only increment if transitioning FROM a non-terminal state
		isOldTerminal := msg.Status == "sent" || msg.Status == "delivered" || msg.Status == "failed"
		isNewTerminal := status == "sent" || status == "delivered" || status == "failed"

		if !isOldTerminal && isNewTerminal {
			if status == "sent" || status == "delivered" {
				sentDelta = 1
			} else if status == "failed" {
				failedDelta = 1
			}
		} else if (msg.Status == "failed") && (status == "sent" || status == "delivered") {
			// If it was failed but now succeeded (e.g. manual retry? though usually retries are new messages)
			// Actually retries in this service create a NEW message or reset the SAME message?
			// Line 449 resets the status to "queued". So it's no longer terminal.
			sentDelta = 1
			failedDelta = -1
		}

		if sentDelta != 0 || failedDelta != 0 {
			if err := s.store.IncrementCampaignStats(ctx, *msg.CampaignID, sentDelta, failedDelta); err != nil {
				log.Printf("Warning: failed to increment campaign stats for campaign %d: %v\n", *msg.CampaignID, err)
			}
		}
	}

	// 6. Trigger Alert if Fail in terminal state
	if status == "failed" {
		title := "Message Delivery Failed"
		message := fmt.Sprintf("Message to %s failed to deliver after %d retries. Content: %s", msg.ToNumber, msg.RetryCount, msg.Body)
		s.alertService.NotifyOrganization(ctx, msg.OrganizationID, "message_failed", title, message, "warning")
	}

	// Determine event type for webhooks
	eventType := "message.status_updated"
	if status == "sent" {
		eventType = "message.sent"
	} else if status == "delivered" {
		eventType = "message.delivered"
	} else if status == "failed" {
		eventType = "message.failed"
	}

	s.webhook.DispatchEvent(msg.OrganizationID, msg.ApplicationID, eventType, map[string]interface{}{
		"message_id":  msgID,
		"status":      status,
		"retry_count": msg.RetryCount,
		"message":     msg, // Include full message context
	})

	// Also dispatch generic status update event for those who want everything
	if eventType != "message.status_updated" {
		s.webhook.DispatchEvent(msg.OrganizationID, msg.ApplicationID, "message.status_updated", map[string]interface{}{
			"message_id":  msgID,
			"status":      status,
			"retry_count": msg.RetryCount,
			"message":     msg,
		})
	}

	return nil
}

func (s *MessageService) ListMessages(ctx context.Context, orgID int, filter store.MessageListFilter) ([]model.Message, error) {
	return s.store.GetMessagesByOrganizationID(ctx, orgID, filter)
}

// RequeueFilter holds the optional scope for a bulk requeue operation.
type RequeueFilter struct {
	AppID      *int
	CampaignID *int
	StartDate  *time.Time
	EndDate    *time.Time
}

// BulkRequeueResult is the response payload for POST /api/messages/requeue.
type BulkRequeueResult struct {
	MatchedCount  int `json:"matched_count"`
	RequeuedCount int `json:"requeued_count"`
}

// BulkRequeue re-enqueues all queued messages matching the given scope.
// Only messages with status "queued" are eligible; no other status is touched.
func (s *MessageService) BulkRequeue(ctx context.Context, orgID int, f RequeueFilter) (BulkRequeueResult, error) {
	filter := store.MessageListFilter{
		AppID:      f.AppID,
		CampaignID: f.CampaignID,
		StartDate:  f.StartDate,
		EndDate:    f.EndDate,
	}

	messages, err := s.store.GetQueuedMessagesByFilter(ctx, orgID, filter)
	if err != nil {
		return BulkRequeueResult{}, fmt.Errorf("failed to fetch queued messages: %w", err)
	}

	result := BulkRequeueResult{MatchedCount: len(messages)}

	for i := range messages {
		msg := &messages[i]
		if err := s.EnqueueSMSDelivery(ctx, msg); err != nil {
			log.Printf("[BulkRequeue] failed to enqueue message %d: %v", msg.ID, err)
			continue
		}
		// Bump updated_at so the watchdog does not immediately re-pick this message.
		if err := s.store.TouchMessageUpdatedAt(ctx, msg.ID); err != nil {
			log.Printf("[BulkRequeue] failed to touch message %d: %v", msg.ID, err)
		}
		result.RequeuedCount++
	}

	log.Printf("[BulkRequeue] org=%d matched=%d requeued=%d", orgID, result.MatchedCount, result.RequeuedCount)
	return result, nil
}

// GetMessage retrieves a single message by ID
func (s *MessageService) GetMessage(ctx context.Context, msgID int) (*model.Message, error) {
	return s.store.GetMessageByID(ctx, msgID)
}

func (s *MessageService) RequeueDeviceMessages(ctx context.Context, deviceID int) error {
	count, err := s.store.RequeueMessagesByDeviceID(ctx, deviceID)
	if err != nil {
		return err
	}
	if count > 0 {
		log.Printf("Failover: Released %d messages from offline device %d\n", count, deviceID)
	}
	return nil
}
