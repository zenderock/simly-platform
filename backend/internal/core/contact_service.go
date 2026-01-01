package core

import (
	"context"
	"errors"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type ContactService struct {
	store *store.Store
}

func NewContactService(store *store.Store) *ContactService {
	return &ContactService{store: store}
}

func (s *ContactService) CreateContact(ctx context.Context, orgID int, req model.CreateContactRequest) (*model.Contact, error) {
	// TODO: Validate phone number format (E.164)
	// TODO: Check duplicates logic if needed (Store constraint handles it but maybe better error here)

	contact := &model.Contact{
		OrganizationID: orgID,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		PhoneNumber:    req.PhoneNumber,
		Email:          req.Email,
		Tags:           req.Tags,
	}

	if err := s.store.CreateContact(ctx, contact); err != nil {
		return nil, err
	}
	return contact, nil
}

func (s *ContactService) ListContacts(ctx context.Context, orgID int) ([]model.Contact, error) {
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

	// Update fields
	contact.FirstName = req.FirstName
	contact.LastName = req.LastName
	contact.PhoneNumber = req.PhoneNumber
	contact.Email = req.Email
	contact.Tags = req.Tags

	if err := s.store.UpdateContact(ctx, contact); err != nil {
		return nil, err
	}
	return contact, nil
}

func (s *ContactService) DeleteContact(ctx context.Context, id, orgID int) error {
	return s.store.DeleteContact(ctx, id, orgID)
}

// Lists

func (s *ContactService) CreateContactList(ctx context.Context, orgID int, req model.CreateContactListRequest) (*model.ContactList, error) {
	list := &model.ContactList{
		OrganizationID: orgID,
		Name:           req.Name,
		Description:    req.Description,
	}
	if err := s.store.CreateContactList(ctx, list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *ContactService) ListContactLists(ctx context.Context, orgID int) ([]model.ContactList, error) {
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
