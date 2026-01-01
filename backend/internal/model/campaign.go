package model

import "time"

const (
	CampaignStatusDraft      = "draft"
	CampaignStatusScheduled  = "scheduled"
	CampaignStatusQueued     = "queued"
	CampaignStatusProcessing = "processing"
	CampaignStatusCompleted  = "completed"
	CampaignStatusFailed     = "failed"
)

type Campaign struct {
	ID             int        `json:"id"`
	OrganizationID int        `json:"organization_id"`
	Name           string     `json:"name"`
	TemplateBody   string     `json:"template_body"`
	ListID         *int       `json:"list_id"`
	DeviceID       *int       `json:"device_id"`
	SimSlot        *int       `json:"sim_slot"`
	Status         string     `json:"status"`
	ScheduledAt    *time.Time `json:"scheduled_at"`
	TotalMessages  int        `json:"total_messages"`
	SentMessages   int        `json:"sent_messages"`
	FailedMessages int        `json:"failed_messages"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type CreateCampaignRequest struct {
	Name         string     `json:"name"`
	TemplateBody string     `json:"template_body"`
	ListID       int        `json:"list_id"`
	DeviceID     int        `json:"device_id"`
	SimSlot      *int       `json:"sim_slot"`
	ScheduledAt  *time.Time `json:"scheduled_at"`
}
type CampaignAnalytics struct {
	CampaignID int            `json:"campaign_id"`
	Total      int            `json:"total"`
	Sent       int            `json:"sent"`
	Failed     int            `json:"failed"`
	Pending    int            `json:"pending"`
	Delivered  int            `json:"delivered"`
	ByStatus   map[string]int `json:"by_status"`
}
