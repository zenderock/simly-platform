package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateContact(ctx context.Context, c *model.Contact) error {
	query := `
		INSERT INTO contacts (organization_id, first_name, last_name, phone_number, email, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query,
		c.OrganizationID,
		c.FirstName,
		c.LastName,
		c.PhoneNumber,
		c.Email,
		c.Tags,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create contact: %w", err)
	}
	return nil
}

func (s *Store) GetContactsByOrganizationID(ctx context.Context, orgID int) ([]model.Contact, error) {
	query := `
		SELECT id, organization_id, first_name, last_name, phone_number, email, tags, created_at, updated_at
		FROM contacts
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query contacts: %w", err)
	}
	defer rows.Close()

	var contacts []model.Contact
	for rows.Next() {
		var c model.Contact
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.FirstName,
			&c.LastName,
			&c.PhoneNumber,
			&c.Email,
			&c.Tags,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan contact: %w", err)
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func (s *Store) GetContactByID(ctx context.Context, id int) (*model.Contact, error) {
	query := `
		SELECT id, organization_id, first_name, last_name, phone_number, email, tags, created_at, updated_at
		FROM contacts
		WHERE id = $1
	`
	var c model.Contact
	err := s.db.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.OrganizationID,
		&c.FirstName,
		&c.LastName,
		&c.PhoneNumber,
		&c.Email,
		&c.Tags,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get contact: %w", err)
	}
	return &c, nil
}

func (s *Store) UpdateContact(ctx context.Context, c *model.Contact) error {
	query := `
		UPDATE contacts
		SET first_name = $1, last_name = $2, phone_number = $3, email = $4, tags = $5, updated_at = NOW()
		WHERE id = $6 AND organization_id = $7
	`
	result, err := s.db.Exec(ctx, query,
		c.FirstName,
		c.LastName,
		c.PhoneNumber,
		c.Email,
		c.Tags,
		c.ID,
		c.OrganizationID,
	)
	if err != nil {
		return fmt.Errorf("failed to update contact: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("contact not found or unauthorized")
	}
	return nil
}

func (s *Store) DeleteContact(ctx context.Context, id, orgID int) error {
	result, err := s.db.Exec(ctx, "DELETE FROM contacts WHERE id = $1 AND organization_id = $2", id, orgID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("contact not found or unauthorized")
	}
	return nil
}

// Contact Lists

func (s *Store) CreateContactList(ctx context.Context, l *model.ContactList) error {
	query := `
		INSERT INTO contact_lists (organization_id, name, description, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query, l.OrganizationID, l.Name, l.Description).Scan(&l.ID, &l.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create contact list: %w", err)
	}
	return nil
}

func (s *Store) GetContactLists(ctx context.Context, orgID int) ([]model.ContactList, error) {
	query := `
		SELECT l.id, l.organization_id, l.name, l.description, l.created_at, COUNT(m.contact_id)
		FROM contact_lists l
		LEFT JOIN contact_list_members m ON l.id = m.list_id
		WHERE l.organization_id = $1
		GROUP BY l.id
		ORDER BY l.created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query contact lists: %w", err)
	}
	defer rows.Close()

	var lists []model.ContactList
	for rows.Next() {
		var l model.ContactList
		if err := rows.Scan(
			&l.ID,
			&l.OrganizationID,
			&l.Name,
			&l.Description,
			&l.CreatedAt,
			&l.MemberCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan contact list: %w", err)
		}
		lists = append(lists, l)
	}
	return lists, nil
}

func (s *Store) GetContactListByID(ctx context.Context, id int) (*model.ContactList, error) {
	query := `
		SELECT l.id, l.organization_id, l.name, l.description, l.created_at, COUNT(m.contact_id)
		FROM contact_lists l
		LEFT JOIN contact_list_members m ON l.id = m.list_id
		WHERE l.id = $1
		GROUP BY l.id
	`
	var l model.ContactList
	err := s.db.QueryRow(ctx, query, id).Scan(
		&l.ID,
		&l.OrganizationID,
		&l.Name,
		&l.Description,
		&l.CreatedAt,
		&l.MemberCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get contact list: %w", err)
	}
	return &l, nil
}

func (s *Store) DeleteContactList(ctx context.Context, id, orgID int) error {
	result, err := s.db.Exec(ctx, "DELETE FROM contact_lists WHERE id = $1 AND organization_id = $2", id, orgID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("contact list not found or unauthorized")
	}
	return nil
}

func (s *Store) AddContactsToList(ctx context.Context, listID int, contactIDs []int) error {
	if len(contactIDs) == 0 {
		return nil
	}

	// Bulk Insert Construction
	// INSERT INTO contact_list_members (list_id, contact_id, created_at) VALUES ($1, $2, NOW()), ($3, $4, NOW()) ...

	query := "INSERT INTO contact_list_members (list_id, contact_id, created_at) VALUES "
	vals := []interface{}{}

	for i, cid := range contactIDs {
		n := i * 2
		query += fmt.Sprintf("($%d, $%d, NOW())", n+1, n+2)
		vals = append(vals, listID, cid)
		if i < len(contactIDs)-1 {
			query += ","
		}
	}

	query += " ON CONFLICT DO NOTHING"

	_, err := s.db.Exec(ctx, query, vals...)
	if err != nil {
		return fmt.Errorf("failed to bulk insert list members: %w", err)
	}
	return nil
}

func (s *Store) RemoveContactFromList(ctx context.Context, listID, contactID int) error {
	_, err := s.db.Exec(ctx, "DELETE FROM contact_list_members WHERE list_id = $1 AND contact_id = $2", listID, contactID)
	return err
}

func (s *Store) GetContactsInList(ctx context.Context, listID int) ([]model.Contact, error) {
	query := `
		SELECT c.id, c.organization_id, c.first_name, c.last_name, c.phone_number, c.email, c.tags, c.created_at, c.updated_at
		FROM contacts c
		JOIN contact_list_members m ON c.id = m.contact_id
		WHERE m.list_id = $1
		ORDER BY c.created_at DESC
	`
	rows, err := s.db.Query(ctx, query, listID)
	if err != nil {
		return nil, fmt.Errorf("failed to query list contacts: %w", err)
	}
	defer rows.Close()

	var contacts []model.Contact
	for rows.Next() {
		var c model.Contact
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.FirstName,
			&c.LastName,
			&c.PhoneNumber,
			&c.Email,
			&c.Tags,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan contact: %w", err)
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}
