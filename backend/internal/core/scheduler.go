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
			s.monitorProcessingCampaigns(ctx)
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
			}
		}
	}
}

func (s *SchedulerService) monitorProcessingCampaigns(ctx context.Context) {
	campaigns, err := s.db.GetProcessingCampaigns(ctx)
	if err != nil {
		log.Printf("Scheduler: Failed to fetch processing campaigns: %v", err)
		return
	}

	for _, c := range campaigns {
		stats, err := s.db.GetCampaignMessageStats(ctx, c.ID)
		if err != nil {
			log.Printf("Scheduler: Failed to fetch stats for campaign %d: %v", c.ID, err)
			continue
		}

		// A campaign is completed when all its messages are in a terminal state
		// Terminal states: sent, delivered, failed
		// Active states: queued, pending, (scheduled - though shouldn't happen for active campaign messages)
		if stats.Queued == 0 && stats.Pending == 0 {
			log.Printf("Scheduler: Campaign %d (%s) finished. Finalizing...", c.ID, c.Name)

			if err := s.db.UpdateCampaignStatus(ctx, c.ID, "completed"); err != nil {
				log.Printf("Scheduler: Failed to update campaign %d status to completed: %v", c.ID, err)
				continue
			}

			// Update final stats for quick access
			if err := s.db.UpdateCampaignFinalStats(ctx, c.ID, stats.Sent+stats.Delivered, stats.Failed); err != nil {
				log.Printf("Scheduler: Failed to update campaign %d final stats: %v", c.ID, err)
			}
		}
	}
}
