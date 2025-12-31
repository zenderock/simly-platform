package core

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type DeviceService struct {
	store        *store.Store
	alertService *AlertService
}

func NewDeviceService(store *store.Store, alertService *AlertService) *DeviceService {
	return &DeviceService{store: store, alertService: alertService}
}

func (s *DeviceService) RegisterDevice(ctx context.Context, orgID int, req model.RegisterDeviceRequest) (*model.Device, error) {
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
