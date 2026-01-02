package model

import (
	"time"
)

// Message status constants
const (
	MessageStatusQueued    = "queued"    // In dispatch queue, not yet assigned to device
	MessageStatusPending   = "pending"   // Assigned to device, awaiting send
	MessageStatusSent      = "sent"      // Sent by device
	MessageStatusDelivered = "delivered" // Delivery confirmed
	MessageStatusFailed    = "failed"    // Terminal failure
)

type Message struct {
	ID              int            `json:"id"`
	OrganizationID  int            `json:"organization_id"`
	ApplicationID   *int           `json:"application_id,omitempty"` // Now linked
	CampaignID      *int           `json:"campaign_id,omitempty"`    // Campaign this message belongs to
	DeviceID        *int           `json:"device_id,omitempty"`
	ToNumber        string         `json:"to"`
	FromNumber      *string        `json:"from,omitempty"` // For inbound messages
	Body            string         `json:"body"`
	Status          string         `json:"status"`    // queued, pending, sent, failed, delivered
	Direction       string         `json:"direction"` // inbound, outbound
	Priority        string         `json:"priority"`  // high, normal, low
	RequiredTags    []string       `json:"required_tags"`
	ExternalID      *string        `json:"external_id,omitempty"`
	ApplicationName *string        `json:"application_name,omitempty"`
	DeviceName      *string        `json:"device_name,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	ScheduledAt     *time.Time     `json:"scheduled_at,omitempty"`
	ProcessedAt     *time.Time     `json:"processed_at,omitempty"`
	RetryCount      int            `json:"retry_count"`
	MaxRetries      int            `json:"max_retries"`
	LastError       *string        `json:"last_error,omitempty"`
	SimSlot         *int           `json:"sim_slot,omitempty"` // 0 or 1
	Metadata        map[string]any `json:"metadata,omitempty"`
}

type SendMessageRequest struct {
	ApplicationID *int       `json:"application_id,omitempty"` // Inferred from API Key usually
	To            string     `json:"to"`
	Body          string     `json:"body"`
	DeviceID      *int       `json:"device_id,omitempty"` // Optional: force specific device
	Priority      string     `json:"priority,omitempty"`  // Default: normal
	Tags          []string   `json:"tags,omitempty"`      // Routing requirements
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
	SimSlot       *int       `json:"sim_slot,omitempty"` // Optional: 0 or 1
}
