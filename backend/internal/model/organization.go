package model

import "time"

type Organization struct {
	ID              int       `json:"id"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	Plan            string    `json:"plan"`
	SMSMonthlyLimit int       `json:"sms_monthly_limit"` // New
	SMSBurstLimit   int       `json:"sms_burst_limit"`   // New
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type OrganizationMember struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	UserID         int       `json:"user_id"`
	Role           string    `json:"role"` // owner, admin, member
	JoinedAt       time.Time `json:"joined_at"`

	// Linked Data (Using pointers to allow nil if not joined)
	User *User `json:"user,omitempty"`
}

type CreateOrgRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug,omitempty"` // Optional, auto-generated if missing
}
