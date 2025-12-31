package core

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

var (
	ErrDeviceLimitReached = errors.New("device limit reached for your plan")
	ErrSimLimitReached    = errors.New("SIM limit per device reached for your plan")
)

type DeviceService struct {
	store        *store.Store
	alertService *AlertService
}

func NewDeviceService(store *store.Store, alertService *AlertService) *DeviceService {
	return &DeviceService{store: store, alertService: alertService}
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

func (s *DeviceService) Heartbeat(ctx context.Context, deviceID int, battery, signal int) error {
	if battery > 0 && battery < 15 {
		// Fetch device to get OrgID and Name (we could optimize this if we had orgID in heartbeat)
		device, err := s.store.GetDeviceByID(ctx, deviceID)
		if err == nil {
			title := fmt.Sprintf("Low Battery: %s", device.Name)
			message := fmt.Sprintf("Device '%s' is at %d%% battery. Please plug it in to ensure service continuity.", device.Name, battery)
			s.alertService.NotifyOrganization(ctx, device.OrganizationID, "low_battery", title, message, "warning")
		}
	}
	return s.store.UpdateDeviceHealth(ctx, deviceID, battery, signal, "online")
}

func (s *DeviceService) DeleteDevice(ctx context.Context, deviceID, orgID int) error {
	return s.store.DeleteDevice(ctx, deviceID, orgID)
}
