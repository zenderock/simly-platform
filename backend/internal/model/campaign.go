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
	// Dispatch settings for intelligent SMS dispatch
	SendWindowStart       *int       `json:"send_window_start,omitempty"`
	SendWindowEnd         *int       `json:"send_window_end,omitempty"`
	PauseReason           *string    `json:"pause_reason,omitempty"`
	EstimatedCompletionAt *time.Time `json:"estimated_completion_at,omitempty"`
	UseAllDevices         bool       `json:"use_all_devices"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type CreateCampaignRequest struct {
	Name            string     `json:"name"`
	TemplateBody    string     `json:"template_body"`
	ListID          *int       `json:"list_id"`
	DeviceID        int        `json:"device_id"`
	SimSlot         *int       `json:"sim_slot"`
	ScheduledAt     *time.Time `json:"scheduled_at"`
	SendWindowStart *int       `json:"send_window_start,omitempty"`
	SendWindowEnd   *int       `json:"send_window_end,omitempty"`
	UseAllDevices   bool       `json:"use_all_devices"`
	AutoLaunch      bool       `json:"auto_launch,omitempty"`
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
