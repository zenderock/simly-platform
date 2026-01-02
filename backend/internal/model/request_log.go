package model

import (
	"time"
)

// RequestLog represents a logged API request to the Public API
type RequestLog struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	ApplicationID  int       `json:"application_id"`
	APIKeyID       int       `json:"api_key_id"`
	Method         string    `json:"method"`
	Path           string    `json:"path"`
	StatusCode     int       `json:"status_code"`
	Duration       int       `json:"duration_ms"`
	RequestBody    string    `json:"request_body,omitempty"`
	ResponseBody   string    `json:"response_body,omitempty"`
	IPAddress      string    `json:"ip_address"`
	UserAgent      string    `json:"user_agent"`
	CreatedAt      time.Time `json:"created_at"`
}

// RequestLogFilters contains filter options for listing request logs
type RequestLogFilters struct {
	StatusCode *int
	Path       *string
	Limit      int
	Offset     int
}
