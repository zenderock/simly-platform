package model

import "time"

type APIKey struct {
	ID             int        `json:"id"`
	OrganizationID int        `json:"organization_id"` // Redundant but good for indexing/security check
	ApplicationID  int        `json:"application_id"`
	Name           string     `json:"name"`
	KeyHash        string     `json:"-"`
	Prefix         string     `json:"prefix"` // Store first few chars for display
	LastUsedAt     *time.Time `json:"last_used_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type CreateAPIKeyRequest struct {
	ApplicationID int    `json:"application_id"`
	Name          string `json:"name"`
}

type APIKeyResponse struct {
	APIKey
	RawKey string `json:"key,omitempty"` // Only returned on creation
}
