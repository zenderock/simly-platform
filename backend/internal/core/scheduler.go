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
		// Move message from 'scheduled' to 'pending' to make it available for delivery.
		// We then explicitly notify the device via FCM to trigger processing.
		if err := s.db.UpdateMessageStatus(ctx, msg.ID, "pending", ""); err != nil {
			log.Printf("Scheduler: Failed to update message %d status: %v", msg.ID, err)
			continue
		}

		if s.messageService != nil {
			s.messageService.NotifyDevice(ctx, &msg)
		}

		// Mark as processed? The status change is enough.
	}
}
