package core

import (
	"context"
	"errors"
	"fmt"
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
	s.webhook.DispatchEvent(orgID, nil, "sms.received", msg)
	return nil
}

// selectBestDevice finds the best ONLINE device matching tags
func (s *MessageService) selectBestDevice(ctx context.Context, orgID int, requiredTags []string) (*model.Device, error) {
	devices, err := s.store.GetDevicesByOrganizationID(ctx, orgID)
	if err != nil || len(devices) == 0 {
		return nil, errors.New("no gateways configured")
	}

	var candidates []model.Device
	for _, d := range devices {
		if d.Status == "online" {
			candidates = append(candidates, d)
		}
	}

	if len(candidates) == 0 {
		return nil, errors.New("no online devices available")
	}

	// Filter by Tags if required
	if len(requiredTags) > 0 {
		var matched []model.Device
		for _, d := range candidates {
			if hasAllTags(d.Tags, requiredTags) {
				matched = append(matched, d)
			}
		}
		if len(matched) == 0 {
			return nil, fmt.Errorf("no online devices found matching tags: %v", requiredTags)
		}
		// Load Balancing: Just pick first one for now (Round Robin optional enhancement)
		return &matched[0], nil
	}

	// Default: Pick first available
	return &candidates[0], nil
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

	// 0. Rate Limiting Check
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

			// Capture a fake message ID from DB for logs
			// We store it but mark as delivered immediately.
			// No Device Needed.
			msg := &model.Message{
				OrganizationID: orgID,
				ApplicationID:  req.ApplicationID,
				ToNumber:       req.To,
				Body:           req.Body,
				Status:         fakeStatus,
				Direction:      "outbound",
				Priority:       req.Priority,
				RequiredTags:   req.Tags,
			}
			if err := s.store.CreateMessage(ctx, msg); err != nil {
				return nil, err
			}
			// Don't call Push. Don't find device.
			// Rate limit increments? Yes, usually Sandbox still has limits to prevent abuse.
			_ = s.rateLimiter.IncrementUsage(ctx, *req.ApplicationID, orgID)

			return msg, nil
		}
	} else {
		// ... existing logic ...
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
		targetDevice, err = s.selectBestDevice(ctx, orgID, req.Tags)
		if err != nil {
			return nil, err
		}
	}

	if targetDevice != nil && targetDevice.FCMToken == "" {
		return nil, errors.New("device has no valid push token")
	}

	// 2. Create Message Record
	msg := &model.Message{
		OrganizationID: orgID,
		ApplicationID:  req.ApplicationID,
		ToNumber:       req.To,
		Body:           req.Body,
		Status:         "pending",
		Direction:      "outbound",
		Priority:       req.Priority,
		RequiredTags:   req.Tags,
		ScheduledAt:    req.ScheduledAt,
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

	// 4. Increment Usage (Fire and forget, or handle error?)
	// Ideally async, but sync is safer for quota integrity.
	if req.ApplicationID != nil {
		_ = s.rateLimiter.IncrementUsage(ctx, *req.ApplicationID, orgID)
	}

	return msg, nil
}

func (s *MessageService) NotifyDevice(ctx context.Context, msg *model.Message) error {
	// If deviceID is missing, we need to find one now (Late Binding for Scheduled Messages)
	var device *model.Device
	var err error

	if msg.DeviceID != nil {
		device, err = s.store.GetDeviceByID(ctx, *msg.DeviceID)
	} else {
		device, err = s.selectBestDevice(ctx, msg.OrganizationID, msg.RequiredTags)
		if err == nil {
			// Update message with selected device
			// s.store.UpdateMessageDevice(ctx, msg.ID, device.ID) // TODO: Implement if needed
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

	return s.notifications.SendPush(ctx, device.FCMToken, "Action Required", "New SMS to send", pushData)
}

func logNotificationError(msgID int, err error) {
	fmt.Printf("[ALERT] Push failed for message %d: %v\n", msgID, err)
}

func (s *MessageService) UpdateStatus(ctx context.Context, msgID int, status string) error {
	// 1. Get Message info (to find Org)
	msg, err := s.store.GetMessageByID(ctx, msgID)
	if err != nil {
		return err
	}

	// 2. Update Status
	if err := s.store.UpdateMessageStatus(ctx, msgID, status); err != nil {
		return err
	}

	// 3. Trigger Alert if Failed
	if status == "failed" {
		title := "Message Delivery Failed"
		message := fmt.Sprintf("Message to %s failed to deliver. Content: %s", msg.ToNumber, msg.Body)
		s.alertService.NotifyOrganization(ctx, msg.OrganizationID, "message_failed", title, message, "warning")
	}

	// 4. Dispatch Webhook
	s.webhook.DispatchEvent(msg.OrganizationID, msg.ApplicationID, "sms.status_updated", map[string]interface{}{
		"message_id": msgID,
		"status":     status,
	})

	return nil
}

func (s *MessageService) ListMessages(ctx context.Context, orgID int, appID *int) ([]model.Message, error) {
	return s.store.GetMessagesByOrganizationID(ctx, orgID, appID)
}
