package core

import (
	"context"
	"log"
	"time"

	"github.com/zenderock/simly-backend/internal/store"
)

type SchedulerService struct {
	db              *store.Store
	messageService  *MessageService
	campaignService *CampaignService
}

func NewSchedulerService(db *store.Store, messageService *MessageService, campaignService *CampaignService) *SchedulerService {
	return &SchedulerService{
		db:              db,
		messageService:  messageService,
		campaignService: campaignService,
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
			s.processScheduledCampaigns(ctx)
		}
	}
}

func (s *SchedulerService) processScheduledMessages(ctx context.Context) {
	messages, err := s.db.GetDueScheduledMessages(ctx)
	if err != nil {
		log.Printf("Scheduler: Failed to fetch due messages: %v", err)
		return
	}

	if len(messages) > 0 {
		log.Printf("Scheduler: Processing %d scheduled messages", len(messages))
		for _, msg := range messages {
			if err := s.db.UpdateMessageStatus(ctx, msg.ID, "pending", ""); err != nil {
				log.Printf("Scheduler: Failed to update message %d status: %v", msg.ID, err)
				continue
			}
			if s.messageService != nil {
				s.messageService.NotifyDevice(ctx, &msg)
			}
		}
	}
}

func (s *SchedulerService) processScheduledCampaigns(ctx context.Context) {
	campaigns, err := s.db.GetDueScheduledCampaigns(ctx)
	if err != nil {
		log.Printf("Scheduler: Failed to fetch due campaigns: %v", err)
		return
	}

	if len(campaigns) > 0 {
		log.Printf("Scheduler: Processing %d scheduled campaigns", len(campaigns))
		for _, c := range campaigns {
			log.Printf("Scheduler: Launching campaign %d (%s)", c.ID, c.Name)
			// Launch the campaign
			if err := s.campaignService.LaunchCampaign(ctx, c.ID, c.OrganizationID); err != nil {
				log.Printf("Scheduler: Failed to launch campaign %d: %v", c.ID, err)
				// Optional: Set status to failed or add a retry mechanism?
				// For now, if launch fails, it stays scheduled and might be picked up again
				// unless we change its status or have a retry count.
				// But LaunchCampaign updates status to Processing on success.
			}
		}
	}
}
