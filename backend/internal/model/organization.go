package model

import "time"

type Organization struct {
	ID                     int        `json:"id"`
	Name                   string     `json:"name"`
	Slug                   string     `json:"slug"`
	Plan                   string     `json:"plan"`
	SMSMonthlyLimit        int        `json:"sms_monthly_limit"`
	SMSBurstLimit          int        `json:"sms_burst_limit"`
	MaxDevices             int        `json:"max_devices"`
	MaxSimsPerDevice       int        `json:"max_sims_per_device"`
	StripeCustomerID       *string    `json:"stripe_customer_id,omitempty"`
	StripeSubscriptionID   *string    `json:"stripe_subscription_id,omitempty"`
	StripePriceID          *string    `json:"stripe_price_id,omitempty"`
	StripeCurrentPeriodEnd *time.Time `json:"stripe_current_period_end,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
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
}
