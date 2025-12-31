package model

import "time"

type Alert struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	Type           string    `json:"type"`     // e.g., "device_offline", "message_failed", "low_credits"
	Severity       string    `json:"severity"` // "info", "warning", "critical"
	Title          string    `json:"title"`
	Message        string    `json:"message"`
	IsRead         bool      `json:"is_read"`
	CreatedAt      time.Time `json:"created_at"`
}
