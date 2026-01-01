package model

import (
	"time"
)

type Message struct {
	ID              int        `json:"id"`
	OrganizationID  int        `json:"organization_id"`
	ApplicationID   *int       `json:"application_id,omitempty"` // Now linked
	DeviceID        *int       `json:"device_id,omitempty"`
	ToNumber        string     `json:"to"`
	Body            string     `json:"body"`
	Status          string     `json:"status"`    // pending, sent, failed, delivered
	Direction       string     `json:"direction"` // inbound, outbound
	Priority        string     `json:"priority"`  // high, normal, low
	RequiredTags    []string   `json:"required_tags"`
	ExternalID      *string    `json:"external_id,omitempty"`
	ApplicationName *string    `json:"application_name,omitempty"`
	DeviceName      *string    `json:"device_name,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	ScheduledAt     *time.Time `json:"scheduled_at,omitempty"`
	ProcessedAt     *time.Time `json:"processed_at,omitempty"`
}

type SendMessageRequest struct {
	ApplicationID *int       `json:"application_id,omitempty"` // Inferred from API Key usually
	To            string     `json:"to"`
	Body          string     `json:"body"`
	DeviceID      *int       `json:"device_id,omitempty"` // Optional: force specific device
	Priority      string     `json:"priority,omitempty"`  // Default: normal
	Tags          []string   `json:"tags,omitempty"`      // Routing requirements
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
}
