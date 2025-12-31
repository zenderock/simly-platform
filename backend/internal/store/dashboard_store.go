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

func (s *Store) GetDashboardStats(ctx context.Context, orgID int64, appID *int) (*DashboardStats, error) {
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
	args := []interface{}{orgID}
	if appID != nil {
		queryMessages += " AND application_id = $2"
		args = append(args, *appID)
	}

	err := s.db.QueryRow(ctx, queryMessages, args...).Scan(
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
	// Note: Devices are shared across the organization, so we don't naturally filter them by app unless tagged.
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

type TrafficStat struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func (s *Store) GetMessageTrafficStats(ctx context.Context, orgID int64, days int, appID *int) ([]TrafficStat, error) {
	query := `
		SELECT 
			TO_CHAR(created_at, 'YYYY-MM-DD') as date,
			COUNT(*) as count
		FROM messages
		WHERE organization_id = $1
		  AND created_at >= NOW() - INTERVAL '1 day' * $2
	`
	args := []interface{}{orgID, days}
	if appID != nil {
		query += " AND application_id = $3"
		args = append(args, *appID)
	}
	query += " GROUP BY date ORDER BY date ASC"

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []TrafficStat
	for rows.Next() {
		var stat TrafficStat
		if err := rows.Scan(&stat.Date, &stat.Count); err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}

	return stats, nil
}
