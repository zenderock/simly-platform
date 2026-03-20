package model

import "time"

type Organization struct {
	ID               int    `json:"id"`
	Name             string `json:"name"`
	Slug             string `json:"slug"`
	Plan             string `json:"plan"`
	SMSMonthlyLimit  int    `json:"sms_monthly_limit"` // Kept for backward compatibility during transition
	SMSBurstLimit    int    `json:"sms_burst_limit"`
	MaxDevices       int    `json:"max_devices"`
	MaxSimsPerDevice int    `json:"max_sims_per_device"`
	// New feature limits for pay-per-use pricing
	MaxApplications          int `json:"max_applications"`
	MaxContacts              int `json:"max_contacts"`
	MaxCampaigns             int `json:"max_campaigns"`
	MaxRecipientsPerCampaign int `json:"max_recipients_per_campaign"`
	AutoSaveContacts         bool `json:"auto_save_contacts"`
	// Billing fields
	StripeCustomerID       *string    `json:"stripe_customer_id,omitempty"`
	StripeSubscriptionID   *string    `json:"stripe_subscription_id,omitempty"`
	StripePriceID          *string    `json:"stripe_price_id,omitempty"`
	StripeCurrentPeriodEnd *time.Time `json:"stripe_current_period_end,omitempty"`
	// Dispatch settings for intelligent SMS dispatch
	SMSThrottleRateSeconds int       `json:"sms_throttle_rate_seconds"`
	SendWindowStart        int       `json:"send_window_start"`
	SendWindowEnd          int       `json:"send_window_end"`
	SendWindowTimezone     string    `json:"send_window_timezone"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
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

type OrganizationStats struct {
	MessagesToday     int     `json:"messages_today"`
	MessagesThisMonth int     `json:"messages_this_month"`
	ActiveDevices     int     `json:"active_devices"`
	TotalDevices      int     `json:"total_devices"`
	SuccessRate       float64 `json:"success_rate"`
	CurrentMonthCost  float64 `json:"current_month_cost"` // New field for dashboard
}

// UsageRecord tracks usage events for billing purposes
type UsageRecord struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	ApplicationID  *int      `json:"application_id,omitempty"`
	MessageID      *int      `json:"message_id,omitempty"`
	UsageType      string    `json:"usage_type"` // "sms", "application", "contact", "campaign"
	Cost           float64   `json:"cost"`       // Cost in cents
	Timestamp      time.Time `json:"timestamp"`
	Period         string    `json:"period"` // YYYY-MM for billing aggregation
	CreatedAt      time.Time `json:"created_at"`
}
