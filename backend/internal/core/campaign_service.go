package core

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type CampaignService struct {
	store          *store.Store
	messageService *MessageService
	featureLimits  *FeatureLimitManager
}

func NewCampaignService(store *store.Store, messageService *MessageService, featureLimits *FeatureLimitManager) *CampaignService {
	return &CampaignService{
		store:          store,
		messageService: messageService,
		featureLimits:  featureLimits,
	}
}

func (s *CampaignService) WithStore(store *store.Store) *CampaignService {
	return &CampaignService{
		store:          store,
		messageService: s.messageService, // MessageService might also need WithStore if it uses store?
		featureLimits:  s.featureLimits.WithStore(store),
	}
}

func (s *CampaignService) CreateCampaign(ctx context.Context, orgID int, req model.CreateCampaignRequest) (*model.Campaign, error) {
	// Check feature limits
	if err := s.featureLimits.ValidateCampaignCreation(ctx, orgID); err != nil {
		return nil, err
	}

	status := model.CampaignStatusDraft
	if req.ScheduledAt != nil {
		status = model.CampaignStatusScheduled
	}

	campaign := &model.Campaign{
		OrganizationID:  orgID,
		Name:            req.Name,
		TemplateBody:    req.TemplateBody,
		Status:          status,
		SimSlot:         req.SimSlot,
		ScheduledAt:     req.ScheduledAt,
		SendWindowStart: req.SendWindowStart,
		SendWindowEnd:   req.SendWindowEnd,
		UseAllDevices:   req.UseAllDevices,
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

	// Auto Launch if requested and not scheduled
	if req.AutoLaunch && req.ScheduledAt == nil {
		if err := s.LaunchCampaign(ctx, campaign.ID, orgID); err != nil {
			// If launch fails, we still return the campaign but maybe log error?
			// Or we return error? If we return error, client thinks creation failed.
			// Better to log and return campaign, but client won't know launch failed.
			// Actually, if launch fails, we should probably return error so client knows.
			return campaign, fmt.Errorf("campaign created but launch failed: %w", err)
		}
		// Refresh campaign status in returned object
		campaign.Status = model.CampaignStatusProcessing
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

func (s *CampaignService) ListCampaignsByStatus(ctx context.Context, orgID int, status string) ([]model.Campaign, error) {
	return s.store.ListCampaignsByStatus(ctx, orgID, status)
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

	if c.Status != model.CampaignStatusDraft && c.Status != model.CampaignStatusScheduled {
		return errors.New("campaign already launched or processing")
	}

	// Validate device assignment based on use_all_devices flag
	if !c.UseAllDevices && c.DeviceID == nil {
		return errors.New("missing device: either specify a device or enable use_all_devices")
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

	// Filter out Blacklisted numbers
	var activeContacts []model.Contact
	for _, contact := range contacts {
		blacklisted, _ := s.store.IsBlacklisted(ctx, orgID, contact.PhoneNumber)
		if !blacklisted {
			activeContacts = append(activeContacts, contact)
		}
	}

	if len(activeContacts) == 0 {
		return errors.New("all contacts in this list have opted out (STOP)")
	}
	contacts = activeContacts

	// Check limit
	if err := s.featureLimits.ValidateCampaignRecipients(ctx, orgID, len(contacts)); err != nil {
		return err
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

	// Determine device ID for message creation
	// If use_all_devices is true, pass 0 (NULL) to let dispatcher assign devices
	// Otherwise use the specified device
	var deviceIDForMessages int
	if c.UseAllDevices {
		deviceIDForMessages = 0 // Will be stored as NULL in database
	} else {
		deviceIDForMessages = *c.DeviceID
	}

	// Create Messages in Bulk with "queued" status
	if err := s.store.BulkCreateMessagesForCampaign(ctx, c.ID, orgID, deviceIDForMessages, messages); err != nil {
		return err
	}

	// Fetch created messages to enqueue them
	queuedMessages, err := s.store.GetQueuedMessagesForCampaign(ctx, c.ID)
	if err != nil {
		// Log error but continuing to update status might be risky if we assume they are processing
		// But since they are in DB, we can retry later.
		// For now, return error to trigger retry in scheduler/caller
		return fmt.Errorf("failed to fetch queued messages for enqueueing: %w", err)
	}

	// Enqueue tasks
	count := 0
	for _, msg := range queuedMessages {
		if err := s.messageService.EnqueueSMSDelivery(ctx, &msg); err != nil {
			// Log but continue, maybe partial failure
			// Scheduler retry might act weird here if we update campaign status
			// But RedisWorker isn't picking them up from DB, so we rely on this.
			// Ideally we should transactionally enqueue or use outbox pattern.
			// For now, log error.
			// fmt.Printf("Failed to enqueue message %d: %v\n", msg.ID, err)
			continue
		}
		count++
	}

	// Update Status to processing
	if err := s.store.UpdateCampaignStatus(ctx, c.ID, model.CampaignStatusProcessing); err != nil {
		return err
	}

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

func (s *CampaignService) ListCampaignMessages(ctx context.Context, id, orgID int, limit int) ([]model.Message, error) {
	// Verify ownership
	_, err := s.GetCampaign(ctx, id, orgID)
	if err != nil {
		return nil, err
	}
	return s.store.GetMessagesByCampaignID(ctx, id, limit)
}
