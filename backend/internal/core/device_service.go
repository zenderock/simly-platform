package core

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

var (
	ErrDeviceLimitReached = errors.New("device limit reached for your plan")
	ErrSimLimitReached    = errors.New("SIM limit per device reached for your plan")
	ErrTokenExpired       = errors.New("link token has expired")
	ErrTokenUsed          = errors.New("link token has already been used")
	ErrInvalidToken       = errors.New("invalid link token")
)

type DeviceService struct {
	store        *store.Store
	alertService *AlertService
	jwtSecret    string
}

func NewDeviceService(store *store.Store, alertService *AlertService, jwtSecret string) *DeviceService {
	return &DeviceService{store: store, alertService: alertService, jwtSecret: jwtSecret}
}

func (s *DeviceService) RegisterDevice(ctx context.Context, orgID int, req model.RegisterDeviceRequest) (*model.Device, error) {
	// Check device limit
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	if org.MaxDevices != -1 { // -1 = unlimited
		deviceCount, err := s.store.CountDevicesByOrganization(ctx, orgID)
		if err != nil {
			return nil, fmt.Errorf("failed to count devices: %w", err)
		}
		if deviceCount >= org.MaxDevices {
			return nil, ErrDeviceLimitReached
		}
	}

	now := time.Now()
	existingDevice, err := s.store.GetDeviceByName(ctx, orgID, req.Name)
	if err == nil {
		existingDevice.FCMToken = req.FCMToken
		existingDevice.Status = "online"
		existingDevice.LastSeenAt = &now
		if err := s.store.UpdateDevice(ctx, existingDevice); err != nil {
			return nil, fmt.Errorf("failed to update device: %w", err)
		}
		return existingDevice, nil
	}

	device := &model.Device{
		OrganizationID: orgID,
		Name:           req.Name,
		FCMToken:       req.FCMToken,
		Status:         "online",
		Tags:           req.Tags,
		LastSeenAt:     &now,
	}

	if err := s.store.CreateDevice(ctx, device); err != nil {
		return nil, err
	}
	return device, nil
}

func (s *DeviceService) CheckSimLimit(ctx context.Context, orgID, deviceID int) error {
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	simCount, err := s.store.CountSimsByDevice(ctx, deviceID)
	if err != nil {
		return fmt.Errorf("failed to count SIMs: %w", err)
	}

	if simCount >= org.MaxSimsPerDevice {
		return ErrSimLimitReached
	}
	return nil
}

func (s *DeviceService) ListDevices(ctx context.Context, orgID int) ([]model.Device, error) {
	return s.store.GetDevicesByOrganizationID(ctx, orgID)
}

func (s *DeviceService) Heartbeat(ctx context.Context, deviceID int, battery, signal int, simCards []model.UpdateSimCardRequest) ([]model.Message, error) {
	if battery > 0 && battery < 15 {
		// Fetch device to get OrgID and Name
		// Fetch device to get OrgID, Name, and Alert History
		device, err := s.store.GetDeviceByID(ctx, deviceID)
		if err == nil {
			// Check cooldown: Only alert if never alerted OR last alert was > 1 hour ago
			shouldAlert := false
			if device.LastBatteryAlertAt == nil {
				shouldAlert = true
			} else if time.Since(*device.LastBatteryAlertAt) > 1*time.Hour {
				shouldAlert = true
			} else {
				// Cooldown active, verify if battery dropped significantly? (optional, for now just strict rate limit)
				// Optional: We could alert if it drops from 14% to 5% instantly, but user wants LESS spam.
			}

			if shouldAlert {
				title := fmt.Sprintf("Low Battery: %s", device.Name)
				message := fmt.Sprintf("Device '%s' is at %d%% battery. Please plug it in to ensure service continuity.", device.Name, battery)
				if err := s.alertService.NotifyOrganization(ctx, device.OrganizationID, "low_battery", title, message, "warning"); err == nil {
					// Update LastBatteryAlertAt only if notification sent (or enqueued)
					_ = s.store.UpdateDeviceLastBatteryAlert(ctx, deviceID)
				}
			}
		}
	}
	if err := s.store.UpdateDeviceHealth(ctx, deviceID, battery, signal, "online"); err != nil {
		return nil, err
	}

	// Update SIM cards if provided
	if len(simCards) > 0 {
		if err := s.store.UpdateDeviceSimCards(ctx, deviceID, simCards); err != nil {
			// Log error but don't fail the heartbeat
			fmt.Printf("Failed to update SIM cards for device %d: %v\n", deviceID, err)
		}
	}

	return s.store.GetPendingMessagesByDeviceID(ctx, deviceID)
}

// GetPendingMessages returns pending messages for a device without updating health stats
func (s *DeviceService) GetPendingMessages(ctx context.Context, deviceID int) ([]model.Message, error) {
	return s.store.GetPendingMessagesByDeviceID(ctx, deviceID)
}

func (s *DeviceService) DeleteDevice(ctx context.Context, deviceID, orgID int) error {
	return s.store.DeleteDevice(ctx, deviceID, orgID)
}

func (s *DeviceService) UpdateDevice(ctx context.Context, deviceID, orgID int, req model.UpdateDeviceRequest) error {
	device, err := s.store.GetDeviceByID(ctx, deviceID)
	if err != nil {
		return err
	}

	if device.OrganizationID != orgID {
		return fmt.Errorf("unauthorized")
	}

	device.Name = req.Name
	device.Tags = req.Tags

	return s.store.UpdateDevice(ctx, device)
}

// GenerateLinkToken creates a new device link token for QR code
func (s *DeviceService) GenerateLinkToken(ctx context.Context, orgID int) (*model.DeviceLinkToken, error) {
	// Check device limit before generating token
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	if org.MaxDevices != -1 {
		deviceCount, err := s.store.CountDevicesByOrganization(ctx, orgID)
		if err != nil {
			return nil, fmt.Errorf("failed to count devices: %w", err)
		}
		if deviceCount >= org.MaxDevices {
			return nil, ErrDeviceLimitReached
		}
	}

	// Clean up expired tokens
	s.store.DeleteExpiredLinkTokens(ctx, orgID)

	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Token expires in 10 minutes
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := s.store.CreateDeviceLinkToken(ctx, orgID, token, expiresAt); err != nil {
		return nil, err
	}

	return &model.DeviceLinkToken{
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}

// GetLinkTokenStatus returns the status of a token: pending, success, expired
func (s *DeviceService) GetLinkTokenStatus(ctx context.Context, orgID int, token string) (map[string]interface{}, error) {
	t, err := s.store.GetDeviceLinkToken(ctx, token)
	if err != nil {
		return nil, ErrInvalidToken
	}

	if t.OrganizationID != orgID {
		return nil, fmt.Errorf("unauthorized")
	}

	if t.UsedAt != nil {
		// Fetch device info
		var deviceName string
		if t.DeviceID != nil {
			if device, err := s.store.GetDeviceByID(ctx, *t.DeviceID); err == nil {
				deviceName = device.Name
			}
		}
		return map[string]interface{}{
			"status":      "success",
			"device_id":   t.DeviceID,
			"device_name": deviceName,
			"used_at":     t.UsedAt,
		}, nil
	}

	if time.Now().After(t.ExpiresAt) {
		return map[string]interface{}{
			"status": "expired",
		}, nil
	}

	return map[string]interface{}{
		"status": "pending",
	}, nil
}

// LinkDevice links a device using a token (called by mobile app)
func (s *DeviceService) LinkDevice(ctx context.Context, req model.LinkDeviceRequest) (*model.LinkDeviceResponse, error) {
	// Get and validate token
	tokenData, err := s.store.GetDeviceLinkToken(ctx, req.Token)
	if err != nil {
		fmt.Printf("LinkDevice: GetDeviceLinkToken failed: %v\n", err)
		return nil, ErrInvalidToken
	}

	if tokenData.UsedAt != nil {
		fmt.Printf("LinkDevice: Token already used at %v\n", tokenData.UsedAt)
		return nil, ErrTokenUsed
	}

	if time.Now().After(tokenData.ExpiresAt) {
		fmt.Printf("LinkDevice: Token expired. Now: %v, ExpiresAt: %v\n", time.Now(), tokenData.ExpiresAt)
		return nil, ErrTokenExpired
	}

	// Check device limit
	org, err := s.store.GetOrganizationByID(ctx, tokenData.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	if org.MaxDevices != -1 {
		deviceCount, err := s.store.CountDevicesByOrganization(ctx, tokenData.OrganizationID)
		if err != nil {
			return nil, fmt.Errorf("failed to count devices: %w", err)
		}
		if deviceCount >= org.MaxDevices {
			return nil, ErrDeviceLimitReached
		}
	}

	// Create device
	now := time.Now()
	device := &model.Device{
		OrganizationID: tokenData.OrganizationID,
		Name:           req.Name,
		Model:          req.Model,
		FCMToken:       req.FCMToken,
		Status:         "online",
		LastSeenAt:     &now,
	}

	if err := s.store.CreateDevice(ctx, device); err != nil {
		return nil, err
	}

	// Mark token as used
	if err := s.store.MarkDeviceLinkTokenUsed(ctx, req.Token, device.ID); err != nil {
		// Device created but token not marked - not critical
		fmt.Printf("Warning: failed to mark token as used: %v\n", err)
	}

	// Generate JWT for device
	claims := jwt.MapClaims{
		"sub":    device.ID,
		"org_id": device.OrganizationID,
		"type":   "device",
		"exp":    time.Now().Add(time.Hour * 24 * 365).Unix(), // 1 year for devices
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to generate device token: %w", err)
	}

	return &model.LinkDeviceResponse{
		ID:             device.ID,
		OrganizationID: device.OrganizationID,
		Token:          tokenString,
		FCMToken:       device.FCMToken,
	}, nil
}

// VerifyDeviceOwnership checks if a device belongs to an organization
func (s *DeviceService) VerifyDeviceOwnership(ctx context.Context, deviceID, orgID int) error {
	device, err := s.store.GetDeviceByID(ctx, deviceID)
	if err != nil {
		return fmt.Errorf("device not found")
	}
	if device.OrganizationID != orgID {
		return fmt.Errorf("unauthorized: device does not belong to organization")
	}
	return nil
}
