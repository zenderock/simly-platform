package core

import (
	"context"
	"errors"
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

	// Update Status to processing - DispatcherService will handle sending
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
