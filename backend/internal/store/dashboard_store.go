package store

import (
	"context"
	"fmt"
)

type DashboardStats struct {
	TotalMessages     int `json:"total_messages"`
	SentMessages      int `json:"sent_messages"`
	DeliveredMessages int `json:"delivered_messages"`
	FailedMessages    int `json:"failed_messages"`
	PendingMessages   int `json:"pending_messages"`
	ActiveDevices     int `json:"active_devices"`
	TotalDevices      int `json:"total_devices"`
}

func (s *Store) GetDashboardStats(ctx context.Context, orgID int) (*DashboardStats, error) {
	stats := &DashboardStats{}

	// Messages Stats
	queryMessages := `
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
			COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
		FROM messages
		WHERE organization_id = $1
	`
	err := s.db.QueryRow(ctx, queryMessages, orgID).Scan(
		&stats.TotalMessages,
		&stats.SentMessages,
		&stats.DeliveredMessages,
		&stats.FailedMessages,
		&stats.PendingMessages,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get message stats: %w", err)
	}

	// Devices Stats
	queryDevices := `
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'online' THEN 1 END) as active
		FROM devices
		WHERE organization_id = $1
	`
	err = s.db.QueryRow(ctx, queryDevices, orgID).Scan(
		&stats.TotalDevices,
		&stats.ActiveDevices,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get device stats: %w", err)
	}

	return stats, nil
}
