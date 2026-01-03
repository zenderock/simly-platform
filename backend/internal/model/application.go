package model

import "time"

type Application struct {
	ID              int                    `json:"id"`
	OrganizationID  int                    `json:"organization_id"`
	Name            string                 `json:"name"`
	IsSandbox       bool                   `json:"is_sandbox"`
	SlackWebhookURL *string                `json:"slack_webhook_url"`
	NtfyTopic       *string                `json:"ntfy_topic"`
	AlertSettings   map[string]interface{} `json:"alert_settings"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

type CreateApplicationRequest struct {
	Name            string                 `json:"name"`
	IsSandbox       bool                   `json:"is_sandbox"`
	SlackWebhookURL *string                `json:"slack_webhook_url,omitempty"`
	NtfyTopic       *string                `json:"ntfy_topic,omitempty"`
	AlertSettings   map[string]interface{} `json:"alert_settings,omitempty"`
}

type UpdateApplicationRequest struct {
	Name            string                 `json:"name"`
	SlackWebhookURL *string                `json:"slack_webhook_url,omitempty"`
	NtfyTopic       *string                `json:"ntfy_topic,omitempty"`
	AlertSettings   map[string]interface{} `json:"alert_settings,omitempty"`
}
