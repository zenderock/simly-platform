package core

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type MessageService struct {
	store                *store.Store
	webhook              *WebhookService
	notifications        NotificationProvider
	rateLimiter          *RateLimitService
	appService           *ApplicationService
	alertService         *AlertService
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
) *MessageService {
	return &MessageService{
		store:                store,
		webhook:              webhook,
		notifications:        notifications,
		rateLimiter:          rateLimiter,
		appService:           appService,
		alertService:         alertService,
		sandboxSuccessNumber: sandboxSuccessNumber,
		sandboxFailureNumber: sandboxFailureNumber,
	}
}

func (s *MessageService) ReceiveSMS(ctx context.Context, orgID int, fromNumber string, body string, deviceID int) error {
	msg := &model.Message{
		OrganizationID: orgID,
		DeviceID:       &deviceID,
		ToNumber:       "me", // Inbound
		Body:           body,
		Status:         "received",
		Direction:      "inbound",
		Priority:       "normal",
		RequiredTags:   []string{},
	}

	if err := s.store.CreateMessage(ctx, msg); err != nil {
		return err
	}

	// Dispatch webhook for the specific organization (Global event for now)
	// TODO: If we implement DID/Virtual Numbers mapped to Apps, we would resolve AppID here.
	s.webhook.DispatchEvent(orgID, nil, "sms.received", msg)
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
			_ = s.rateLimiter.IncrementUsage(ctx, *req.ApplicationID, orgID)

			return msg, nil
		}
	}

	// 1. Device Selection (Smart Routing) - SKIP IF SCHEDULED
	if req.ScheduledAt != nil && req.ScheduledAt.After(time.Now()) {
		// Valid Scheduled Message
	} else if req.DeviceID != nil {
		// Specific Device Requested
		device, err := s.store.GetDeviceByID(ctx, *req.DeviceID)
		if err != nil {
			return nil, fmt.Errorf("device not found: %w", err)
		}
		if device.OrganizationID != orgID {
			return nil, errors.New("unauthorized: device does not belong to your organization")
		}
		if device.Status != "online" {
			return nil, errors.New("device is offline")
		}
		targetDevice = device
	} else {
		// Smart Selection based on Tags
		targetDevice, err = s.selectBestDevice(ctx, orgID, req.Tags, nil)
		if err != nil {
			return nil, err
		}
	}

	if targetDevice != nil && targetDevice.FCMToken == "" {
		return nil, errors.New("device has no valid push token")
	}

	// 3. Create Message Record
	msg := &model.Message{
		OrganizationID: orgID,
		ApplicationID:  req.ApplicationID,
		ToNumber:       req.To,
		Body:           body,
		Status:         "pending",
		Direction:      "outbound",
		Priority:       req.Priority,
		RequiredTags:   req.Tags,
		ScheduledAt:    req.ScheduledAt,
		MaxRetries:     3, // Default retries
		SimSlot:        req.SimSlot,
	}

	if targetDevice != nil {
		msg.DeviceID = &targetDevice.ID
	}

	if req.ScheduledAt != nil && req.ScheduledAt.After(time.Now()) {
		msg.Status = "scheduled"
	}

	if msg.Priority == "" {
		msg.Priority = "normal"
	}
	if msg.RequiredTags == nil {
		msg.RequiredTags = []string{}
	}

	if err := s.store.CreateMessage(ctx, msg); err != nil {
		return nil, err
	}

	// 3. Trigger FCM Push (ONLY IF NOT SCHEDULED)
	if msg.Status == "pending" && targetDevice != nil {
		if err := s.NotifyDevice(ctx, msg); err != nil {
			logNotificationError(msg.ID, err)
		}
	}

	// 5. Increment Usage
	if req.ApplicationID != nil {
		_ = s.rateLimiter.IncrementUsage(ctx, *req.ApplicationID, orgID)
	}

	return msg, nil
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
		device, err = s.selectBestDevice(ctx, msg.OrganizationID, msg.RequiredTags, excludeID)
		if err == nil {
			// Update message with selected device
			if updateErr := s.store.UpdateMessageDevice(ctx, msg.ID, device.ID); updateErr != nil {
				log.Printf("Warning: failed to update message %d with device %d: %v\n", msg.ID, device.ID, updateErr)
			}
			msg.DeviceID = &device.ID
		}
	}

	if err != nil {
		return fmt.Errorf("failed to find device for notification: %w", err)
	}

	if device.FCMToken == "" {
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

	return s.notifications.SendPush(ctx, device.FCMToken, "Action Required", "New SMS to send", pushData)
}

func logNotificationError(msgID int, err error) {
	fmt.Printf("[ALERT] Push failed for message %d: %v\n", msgID, err)
}

func (s *MessageService) UpdateStatus(ctx context.Context, msgID int, status string) error {
	// 1. Get Message info
	msg, err := s.store.GetMessageByID(ctx, msgID)
	if err != nil {
		return err
	}

	// 2. Handle Retries for Failures
	if status == "failed" {
		if msg.RetryCount < msg.MaxRetries {
			newRetryCount := msg.RetryCount + 1
			log.Printf("Message %d failed, retrying (%d/%d) with failover...\n", msgID, newRetryCount, msg.MaxRetries)

			// 1. Clear device assignment and increment retry in DB
			if err := s.store.UpdateMessageRetry(ctx, msgID, newRetryCount, "Last delivery attempt failed", "pending"); err != nil {
				return fmt.Errorf("failed to update message retry: %w", err)
			}

			// 2. Refresh message model for notification
			msg.RetryCount = newRetryCount
			msg.Status = "pending"
			// IMPORTANT: Clear DeviceID in model so NotifyDevice performs Late Binding / Smart Routing again
			oldDeviceID := msg.DeviceID
			msg.DeviceID = nil

			// 3. Trigger new routing & notification
			return s.NotifyDeviceWithExclusion(ctx, msg, oldDeviceID)
		}
	}

	// 3. Update Status Normally (Success or Terminal Failure)
	if err := s.store.UpdateMessageStatus(ctx, msgID, status); err != nil {
		return err
	}

	// 4. Trigger Alert if Fail in terminal state
	if status == "failed" {
		title := "Message Delivery Failed"
		message := fmt.Sprintf("Message to %s failed to deliver after %d retries. Content: %s", msg.ToNumber, msg.RetryCount, msg.Body)
		s.alertService.NotifyOrganization(ctx, msg.OrganizationID, "message_failed", title, message, "warning")
	}

	// 5. Dispatch Webhook
	s.webhook.DispatchEvent(msg.OrganizationID, msg.ApplicationID, "sms.status_updated", map[string]interface{}{
		"message_id":  msgID,
		"status":      status,
		"retry_count": msg.RetryCount,
	})

	return nil
}

func (s *MessageService) ListMessages(ctx context.Context, orgID int, appID *int) ([]model.Message, error) {
	return s.store.GetMessagesByOrganizationID(ctx, orgID, appID)
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
