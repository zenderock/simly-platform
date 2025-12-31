package core

import (
	"context"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type DeviceService struct {
	store *store.Store
}

func NewDeviceService(store *store.Store) *DeviceService {
	return &DeviceService{store: store}
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
	return s.store.UpdateDeviceHealth(ctx, deviceID, battery, signal, "online")
}

func (s *DeviceService) DeleteDevice(ctx context.Context, deviceID, orgID int) error {
	return s.store.DeleteDevice(ctx, deviceID, orgID)
}
