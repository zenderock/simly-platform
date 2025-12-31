package model

import "time"

type Webhook struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	ApplicationID  *int      `json:"application_id,omitempty"` // Nullable
	URL            string    `json:"url"`
	Secret         string    `json:"secret"`
	EventTypes     string    `json:"event_types"` // e.g. "sms.received"
	CreatedAt      time.Time `json:"created_at"`
}

type CreateWebhookRequest struct {
	URL           string `json:"url"`
	EventTypes    string `json:"event_types"`
	ApplicationID *int   `json:"application_id"` // Optional
}
