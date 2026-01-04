package model

import "time"

type Contact struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	PhoneNumber    string    `json:"phone_number"` // E.164 format
	Email          string    `json:"email"`
	Tags           []string  `json:"tags"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Blacklist struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	PhoneNumber    string    `json:"phone_number"`
	CreatedAt      time.Time `json:"created_at"`
}

type ContactList struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	CreatedAt      time.Time `json:"created_at"`
	MemberCount    int       `json:"member_count,omitempty"` // Computed field
}

type CreateContactRequest struct {
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	PhoneNumber string   `json:"phone_number"`
	Email       string   `json:"email"`
	Tags        []string `json:"tags"`
}

type CreateContactListRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type AddContactToListRequest struct {
	ContactIDs []int `json:"contact_ids"`
}
