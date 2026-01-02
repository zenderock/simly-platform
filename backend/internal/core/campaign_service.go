package core

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type CampaignService struct {
	store          *store.Store
	messageService *MessageService
}

func NewCampaignService(store *store.Store, messageService *MessageService) *CampaignService {
	return &CampaignService{store: store, messageService: messageService}
}

func (s *CampaignService) CreateCampaign(ctx context.Context, orgID int, req model.CreateCampaignRequest) (*model.Campaign, error) {
	campaign := &model.Campaign{
		OrganizationID: orgID,
		Name:           req.Name,
		TemplateBody:   req.TemplateBody,
		Status:         model.CampaignStatusDraft,
		SimSlot:        req.SimSlot,
		ScheduledAt:    req.ScheduledAt,
	}

	// Validate List and Device ownership if provided
	if req.ListID != nil && *req.ListID != 0 {
		list, err := s.store.GetContactListByID(ctx, *req.ListID)
		if err != nil {
			return nil, err
		}
		if list.OrganizationID != orgID {
			return nil, errors.New("unauthorized list access")
		}
		campaign.ListID = req.ListID
	}

	if req.DeviceID != 0 {
		device, err := s.store.GetDeviceByID(ctx, req.DeviceID)
		if err != nil {
			return nil, err
		}
		if device.OrganizationID != orgID {
			return nil, errors.New("unauthorized device access")
		}
		campaign.DeviceID = &req.DeviceID
	}

	if err := s.store.CreateCampaign(ctx, campaign); err != nil {
		return nil, err
	}
	return campaign, nil
}

func (s *CampaignService) GetCampaign(ctx context.Context, id, orgID int) (*model.Campaign, error) {
	c, err := s.store.GetCampaignByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c.OrganizationID != orgID {
		return nil, errors.New("unauthorized")
	}
	return c, nil
}

func (s *CampaignService) ListCampaigns(ctx context.Context, orgID int) ([]model.Campaign, error) {
	return s.store.ListCampaigns(ctx, orgID)
}

func (s *CampaignService) DeleteCampaign(ctx context.Context, id, orgID int) error {
	return s.store.DeleteCampaign(ctx, id, orgID)
}

// LaunchCampaign prepares payload and creates messages
func (s *CampaignService) LaunchCampaign(ctx context.Context, id, orgID int) error {
	c, err := s.GetCampaign(ctx, id, orgID)
	if err != nil {
		return err
	}

	if c.Status != model.CampaignStatusDraft {
		return errors.New("campaign already launched or processing")
	}

	if c.DeviceID == nil {
		return errors.New("missing device")
	}

	// Fetch Contacts - either from specific list or all contacts
	var contacts []model.Contact
	if c.ListID != nil {
		contacts, err = s.store.GetContactsInList(ctx, *c.ListID)
	} else {
		// ListID is nil means "All Contacts"
		contacts, err = s.store.GetContactsByOrganizationID(ctx, orgID)
	}
	if err != nil {
		return err
	}

	if len(contacts) == 0 {
		return errors.New("no contacts found")
	}

	// Prepare Messages
	var messages []model.Message
	for _, contact := range contacts {
		body := replaceVariables(c.TemplateBody, &contact)
		messages = append(messages, model.Message{
			ToNumber: contact.PhoneNumber,
			Body:     body,
			SimSlot:  c.SimSlot,
		})
	}

	// Create Messages in Bulk
	if err := s.store.BulkCreateMessagesForCampaign(ctx, c.ID, orgID, *c.DeviceID, messages); err != nil {
		return err
	}

	// Update Status
	if err := s.store.UpdateCampaignStatus(ctx, c.ID, model.CampaignStatusProcessing); err != nil {
		return err
	}

	// Kick off notifications asynchronously
	go func() {
		// Create a detached context with timeout
		bgCtx, cancel := context.WithTimeout(context.Background(), 1*time.Hour) // Allow long time for large lists
		defer cancel()

		pendingMsgs, err := s.store.GetPendingMessagesForCampaign(bgCtx, c.ID)
		if err != nil {
			fmt.Printf("Error fetching pending messages for campaign %d: %v\n", c.ID, err)
			return
		}

		fmt.Printf("Starting broadcast for campaign %d: %d messages\n", c.ID, len(pendingMsgs))

		for _, m := range pendingMsgs {
			if err := s.messageService.NotifyDevice(bgCtx, &m); err != nil {
				// Don't stop, just log. Device might be offline or busy.
				// App polling will pick it up later.
				// fmt.Printf("Failed to notify device for msg %d: %v\n", m.ID, err)
			}
			// Small delay to avoid flooding FCM API rate limits
			time.Sleep(10 * time.Millisecond)
		}
	}()

	return nil
}

func replaceVariables(template string, contact *model.Contact) string {
	res := strings.ReplaceAll(template, "{{first_name}}", contact.FirstName)
	res = strings.ReplaceAll(res, "{{last_name}}", contact.LastName)
	res = strings.ReplaceAll(res, "{{phone}}", contact.PhoneNumber)
	res = strings.ReplaceAll(res, "{{email}}", contact.Email)
	// TODO: Add support for custom attributes/tags if needed
	return res
}
func (s *CampaignService) GetCampaignAnalytics(ctx context.Context, id, orgID int) (*model.CampaignAnalytics, error) {
	// Verify ownership first
	_, err := s.GetCampaign(ctx, id, orgID)
	if err != nil {
		return nil, err
	}
	return s.store.GetCampaignAnalytics(ctx, id)
}
