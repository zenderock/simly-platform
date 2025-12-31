package model

import (
	"time"
)

type Device struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	Name           string    `json:"name"`
	PhoneNumber    string    `json:"phone_number"` // Populated after initial sync
	FCMToken       string    `json:"fcm_token"`
	Status         string    `json:"status"` // online, offline
	Tags           []string  `json:"tags"`   // e.g. ["marketing", "otp", "uk-sim"]
	LastSeenAt     time.Time `json:"last_seen_at"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type RegisterDeviceRequest struct {
	Name        string   `json:"name"`
	FCMToken    string   `json:"fcm_token"`
	PhoneNumber string   `json:"phone_number"`
	Tags        []string `json:"tags,omitempty"`
}

type UpdateDeviceStatusRequest struct {
	Status       string `json:"status"`
	BatteryLevel int    `json:"battery_level,omitempty"` // Example extra field
}

// Token used for QR Code linking flow (optional, but good practice)
type DeviceLinkToken struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}
