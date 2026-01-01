package core

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/zenderock/simly-backend/internal/store"
)

type MonitoringService struct {
	store        *store.Store
	alertService *AlertService
	messages     *MessageService
	interval     time.Duration
	threshold    time.Duration
}

func NewMonitoringService(s *store.Store, alertService *AlertService, messages *MessageService) *MonitoringService {
	return &MonitoringService{
		store:        s,
		alertService: alertService,
		messages:     messages,
		interval:     1 * time.Minute,
		threshold:    10 * time.Minute,
	}
}

func (s *MonitoringService) Start(ctx context.Context) {
	log.Printf("Monitoring: Heartbeat monitor started (interval: %v, threshold: %v)", s.interval, s.threshold)
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("Monitoring: Stopping heartbeat monitor...")
			return
		case <-ticker.C:
			s.CheckDevices(ctx)
		}
	}
}

func (s *MonitoringService) CheckDevices(ctx context.Context) {
	// log.Println("Monitoring: Checking for inactive devices...")

	devices, err := s.store.GetInactiveDevices(ctx, s.threshold)
	if err != nil {
		log.Printf("Monitoring: Failed to fetch inactive devices: %v", err)
		return
	}

	for _, d := range devices {
		log.Printf("Monitoring: Device %s (ID: %d) is offline. Last seen: %v", d.Name, d.ID, d.LastSeenAt)

		// 1. Update status in DB
		if err := s.store.UpdateDeviceStatus(ctx, d.ID, "offline"); err != nil {
			log.Printf("Monitoring: Failed to update device %d status to offline: %v", d.ID, err)
			continue
		}

		// 2. Requeue all pending messages from this device (Failover)
		if err := s.messages.RequeueDeviceMessages(ctx, d.ID); err != nil {
			log.Printf("Monitoring: Failed to requeue messages for device %d: %v", d.ID, err)
		}

		// 2. Trigger Alert
		title := fmt.Sprintf("Device Offline: %s", d.Name)
		msg := fmt.Sprintf("Your device %s (%s) has been offline for more than %v. Please check its connection and battery.", d.Name, d.Model, s.threshold)

		err := s.alertService.NotifyOrganization(ctx, d.OrganizationID, "device_offline", title, msg, "warning")
		if err != nil {
			log.Printf("Monitoring: Failed to send alert for device %d: %v", d.ID, err)
		}
	}
}
