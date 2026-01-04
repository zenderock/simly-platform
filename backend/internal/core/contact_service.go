package core

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type ContactService struct {
	store         *store.Store
	featureLimits *FeatureLimitManager
}

func NewContactService(store *store.Store, featureLimits *FeatureLimitManager) *ContactService {
	return &ContactService{
		store:         store,
		featureLimits: featureLimits,
	}
}

func (s *ContactService) CreateContact(ctx context.Context, orgID int, req model.CreateContactRequest) (*model.Contact, error) {
	// Check feature limits
	if err := s.featureLimits.ValidateContactCreation(ctx, orgID, 1); err != nil {
		return nil, err
	}

	// Normalize phone number (strip whitespace, ensure starts with +)
	phone := strings.ReplaceAll(req.PhoneNumber, " ", "")

	if !s.isValidE164(phone) {
		return nil, errors.New("invalid phone number format: must be E.164 (e.g., +1234567890)")
	}

	// Handle Application Isolation
	var appIDPtr *int
	if req.ApplicationID != 0 {
		appIDPtr = &req.ApplicationID
	}

	contact := &model.Contact{
		OrganizationID: orgID,
		ApplicationID:  appIDPtr,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		PhoneNumber:    phone,
		Email:          req.Email,
		Tags:           req.Tags,
	}

	if err := s.store.CreateContact(ctx, contact); err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			return nil, fmt.Errorf("contact with phone number %s already exists", phone)
		}
		return nil, err
	}
	return contact, nil
}

func (s *ContactService) isValidE164(phone string) bool {
	if len(phone) < 8 || len(phone) > 16 {
		return false
	}
	if !strings.HasPrefix(phone, "+") {
		return false
	}
	for _, r := range phone[1:] {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func (s *ContactService) ListContacts(ctx context.Context, orgID int, appID int) ([]model.Contact, error) {
	if appID != 0 {
		return s.store.GetContactsByApplicationID(ctx, appID)
	}
	return s.store.GetContactsByOrganizationID(ctx, orgID)
}

func (s *ContactService) GetContact(ctx context.Context, id, orgID int) (*model.Contact, error) {
	contact, err := s.store.GetContactByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if contact.OrganizationID != orgID {
		return nil, errors.New("unauthorized") // Assuming this error exists or we return generic Unauthorized
	}
	return contact, nil
}

func (s *ContactService) UpdateContact(ctx context.Context, id, orgID int, req model.CreateContactRequest) (*model.Contact, error) {
	contact, err := s.GetContact(ctx, id, orgID)
	if err != nil {
		return nil, err
	}

	// Normalize and Validate
	phone := strings.ReplaceAll(req.PhoneNumber, " ", "")
	if !s.isValidE164(phone) {
		return nil, errors.New("invalid phone number format: must be E.164")
	}

	// Update fields
	contact.FirstName = req.FirstName
	contact.LastName = req.LastName
	contact.PhoneNumber = phone
	contact.Email = req.Email
	contact.Tags = req.Tags
	// Note: We typically don't allow moving contacts between apps/orgs via Update, keeping AppID as is.

	if err := s.store.UpdateContact(ctx, contact); err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			return nil, fmt.Errorf("contact with phone number %s already exists", phone)
		}
		return nil, err
	}
	return contact, nil
}

func (s *ContactService) DeleteContact(ctx context.Context, id, orgID int) error {
	return s.store.DeleteContact(ctx, id, orgID)
}

// Lists

func (s *ContactService) CreateContactList(ctx context.Context, orgID int, req model.CreateContactListRequest) (*model.ContactList, error) {
	var appIDPtr *int
	if req.ApplicationID != 0 {
		appIDPtr = &req.ApplicationID
	}

	list := &model.ContactList{
		OrganizationID: orgID,
		ApplicationID:  appIDPtr,
		Name:           req.Name,
		Description:    req.Description,
	}
	if err := s.store.CreateContactList(ctx, list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *ContactService) ListContactLists(ctx context.Context, orgID int, appID int) ([]model.ContactList, error) {
	if appID != 0 {
		return s.store.GetContactListsByApplication(ctx, appID)
	}
	return s.store.GetContactLists(ctx, orgID)
}

func (s *ContactService) DeleteContactList(ctx context.Context, id, orgID int) error {
	return s.store.DeleteContactList(ctx, id, orgID)
}

func (s *ContactService) verifyListOwnership(ctx context.Context, listID, orgID int) (*model.ContactList, error) {
	list, err := s.store.GetContactListByID(ctx, listID)
	if err != nil {
		return nil, err
	}
	if list.OrganizationID != orgID {
		return nil, errors.New("unauthorized")
	}
	return list, nil
}

func (s *ContactService) AddContactsToList(ctx context.Context, listID, orgID int, contactIDs []int) error {
	if _, err := s.verifyListOwnership(ctx, listID, orgID); err != nil {
		return err
	}
	return s.store.AddContactsToList(ctx, listID, contactIDs)
}

func (s *ContactService) RemoveContactFromList(ctx context.Context, listID, contactID, orgID int) error {
	if _, err := s.verifyListOwnership(ctx, listID, orgID); err != nil {
		return err
	}
	return s.store.RemoveContactFromList(ctx, listID, contactID)
}

func (s *ContactService) GetListDetails(ctx context.Context, listID, orgID int) (*model.ContactList, []model.Contact, error) {
	// Get List Metadata
	list, err := s.verifyListOwnership(ctx, listID, orgID)
	if err != nil {
		return nil, nil, err
	}

	// Get Members
	contacts, err := s.store.GetContactsInList(ctx, listID)
	if err != nil {
		return nil, nil, err
	}
	return list, contacts, nil
}
func (s *ContactService) ImportContacts(ctx context.Context, orgID int, appID int, listID *int, reader io.Reader) (int, error) {
	csvReader := csv.NewReader(reader)
	csvReader.TrimLeadingSpace = true

	// 1. Read Header
	header, err := csvReader.Read()
	if err != nil {
		return 0, fmt.Errorf("failed to read CSV header: %w", err)
	}

	// Map columns
	colMap := make(map[string]int)
	for i, h := range header {
		h = strings.ToLower(strings.TrimSpace(h))
		switch {
		case strings.Contains(h, "first") || strings.Contains(h, "prénom"):
			colMap["first_name"] = i
		case strings.Contains(h, "last") || strings.Contains(h, "nom"):
			colMap["last_name"] = i
		case strings.Contains(h, "phone") || strings.Contains(h, "tel") || strings.Contains(h, "mobile"):
			colMap["phone"] = i
		case strings.Contains(h, "email") || strings.Contains(h, "courriel"):
			colMap["email"] = i
		case strings.Contains(h, "tag"):
			colMap["tags"] = i
		}
	}

	// Validate required columns
	if _, ok := colMap["phone"]; !ok {
		return 0, errors.New("CSV must contain a 'phone' column")
	}

	// 2. Read Rows
	var contactsToCreate []model.Contact
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Skip malformed rows or return error?
			// For bulk import, skipping might be better but let's log or stop if too many errors.
			continue
		}

		// Normalize and Validate
		phone := strings.ReplaceAll(record[colMap["phone"]], " ", "")
		if !s.isValidE164(phone) {
			continue // Skip invalid rows in bulk import
		}

		contact := model.Contact{
			OrganizationID: orgID,
			PhoneNumber:    phone,
		}

		if appID != 0 {
			contact.ApplicationID = &appID
		}

		if idx, ok := colMap["first_name"]; ok && idx < len(record) {
			contact.FirstName = strings.TrimSpace(record[idx])
		}
		if idx, ok := colMap["last_name"]; ok && idx < len(record) {
			contact.LastName = strings.TrimSpace(record[idx])
		}
		if idx, ok := colMap["email"]; ok && idx < len(record) {
			contact.Email = strings.TrimSpace(record[idx])
		}
		if idx, ok := colMap["tags"]; ok && idx < len(record) {
			tagStr := strings.TrimSpace(record[idx])
			if tagStr != "" {
				contact.Tags = strings.Split(tagStr, ",")
			}
		}

		// Basic validation
		if contact.PhoneNumber == "" {
			continue
		}

		contactsToCreate = append(contactsToCreate, contact)
	}

	if len(contactsToCreate) == 0 {
		return 0, errors.New("no valid contacts found in CSV")
	}

	// Check feature limits before bulk creation
	if err := s.featureLimits.ValidateContactCreation(ctx, orgID, len(contactsToCreate)); err != nil {
		return 0, err
	}

	// 3. Bulk Create
	contactIDs, err := s.store.BulkCreateContacts(ctx, orgID, appID, contactsToCreate)
	if err != nil {
		return 0, fmt.Errorf("failed to bulk create contacts: %w", err)
	}

	// 4. Link to List if requested
	if listID != nil && *listID != 0 {
		if err := s.AddContactsToList(ctx, *listID, orgID, contactIDs); err != nil {
			return len(contactIDs), fmt.Errorf("contacts imported but failed to link to list: %w", err)
		}
	}

	return len(contactIDs), nil
}
