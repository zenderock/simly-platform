package model

import (
	"time"
)

type Device struct {
	ID                 int        `json:"id"`
	OrganizationID     int        `json:"organization_id"`
	Name               string     `json:"name"`
	Model              string     `json:"model"`
	FCMToken           string     `json:"fcm_token"`
	Status             string     `json:"status"` // online, offline
	BatteryLevel       int        `json:"battery_level"`
	SignalStrength     int        `json:"signal_strength"`
	Tags               []string   `json:"tags"` // e.g. ["marketing", "otp", "uk-sim"]
	SimCards           []SimCard  `json:"sim_cards"`
	LastSeenAt         *time.Time `json:"last_seen_at"`
	LastBatteryAlertAt *time.Time `json:"last_battery_alert_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type SimCard struct {
	ID          int    `json:"id"`
	DeviceID    int    `json:"device_id"`
	SlotIndex   int    `json:"slot_index"` // 0 or 1
	PhoneNumber string `json:"phone_number"`
	Operator    string `json:"operator"`
	IsActive    bool   `json:"is_active"`
}

type RegisterDeviceRequest struct {
	Name        string   `json:"name"`
	FCMToken    string   `json:"fcm_token"`
	PhoneNumber string   `json:"phone_number"`
	Tags        []string `json:"tags,omitempty"`
}

type UpdateDeviceRequest struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

type UpdateDeviceStatusRequest struct {
	Status         string                 `json:"status"`
	BatteryLevel   int                    `json:"battery_level,omitempty"`
	SignalStrength int                    `json:"signal_strength,omitempty"`
	SimCards       []UpdateSimCardRequest `json:"sim_cards,omitempty"`
}

type UpdateSimCardRequest struct {
	SlotIndex   int    `json:"slot_index"`
	PhoneNumber string `json:"phone_number"`
	Operator    string `json:"operator"`
	IsActive    bool   `json:"is_active"`
}

// Token used for QR Code linking flow (optional, but good practice)
type DeviceLinkToken struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// DeviceLinkTokenFull represents a device link token with all fields
type DeviceLinkTokenFull struct {
	ID             int        `json:"id"`
	OrganizationID int        `json:"organization_id"`
	Token          string     `json:"token"`
	ExpiresAt      time.Time  `json:"expires_at"`
	UsedAt         *time.Time `json:"used_at,omitempty"`
	DeviceID       *int       `json:"device_id,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// LinkDeviceRequest is sent by the mobile app to link a device
type LinkDeviceRequest struct {
	Token    string `json:"token"`
	Name     string `json:"name"`
	Model    string `json:"model"`
	FCMToken string `json:"fcm_token"`
}

// LinkDeviceResponse is returned to the mobile app after successful linking
type LinkDeviceResponse struct {
	ID             int    `json:"id"`
	OrganizationID int    `json:"organization_id"`
	Token          string `json:"token"`
	FCMToken       string `json:"fcm_token"`
}
