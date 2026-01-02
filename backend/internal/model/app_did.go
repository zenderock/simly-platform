package model

import "time"

// AppDID represents a DID (Direct Inward Dialing) number assigned to an application
// This allows routing incoming SMS to specific applications based on the destination number
type AppDID struct {
	ID            int       `json:"id"`
	ApplicationID int       `json:"application_id"`
	DIDNumber     string    `json:"did_number"`
	Description   string    `json:"description"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateAppDIDRequest represents the request to create a new DID assignment
type CreateAppDIDRequest struct {
	ApplicationID int    `json:"application_id"`
	DIDNumber     string `json:"did_number"`
	Description   string `json:"description"`
}

// UpdateAppDIDRequest represents the request to update a DID assignment
type UpdateAppDIDRequest struct {
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}
