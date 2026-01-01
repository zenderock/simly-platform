package core

import (
	"context"
	"log"
	"time"

	"github.com/zenderock/simly-backend/internal/store"
)

type SchedulerService struct {
	db             *store.Store
	messageService *MessageService
}

func NewSchedulerService(db *store.Store, messageService *MessageService) *SchedulerService {
	return &SchedulerService{
		db:             db,
		messageService: messageService,
	}
}

func (s *SchedulerService) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	log.Println("Scheduler service started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Scheduler service stopping")
			return
		case <-ticker.C:
			s.processScheduledMessages(ctx)
		}
	}
}

func (s *SchedulerService) processScheduledMessages(ctx context.Context) {
	messages, err := s.db.GetDueScheduledMessages(ctx)
	if err != nil {
		log.Printf("Scheduler: Failed to fetch due messages: %v", err)
		return
	}

	if len(messages) == 0 {
		return
	}

	log.Printf("Scheduler: Processing %d scheduled messages", len(messages))

	for _, msg := range messages {
		// Update status to pending so the message service can pick it up or send it directly
		// Actually, since we have the message service, we can re-route it through SendSMS logic
		// But SendSMS logic handles creation. Here we have an existing message.
		// We should probably just change status to 'pending' and notify devices via webhook/SSE?
		// Or calling InternalReceiveSMS? No that's for inbound.

		// Best approach: If we change status to 'pending', the device (if polling) or websocket will pick it up.
		// We also need to trigger the notification to the device.

		err := s.db.UpdateMessageStatus(ctx, msg.ID, "pending")
		if err != nil {
			log.Printf("Scheduler: Failed to update message %d status: %v", msg.ID, err)
			continue
		}

		// If we have a notification/alert system to wake up devices, trigger it here.
		// The MessageService might have a method for "ProcessOutboundMessage" but it seems `SendSMS` does creation + notification.
		// We might need to expose a `NotifyDeviceNewMessage` in MessageService.

		if s.messageService != nil {
			s.messageService.NotifyDevice(ctx, &msg)
		}

		// Mark as processed? The status change is enough.
	}
}
