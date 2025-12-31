package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateDevice(ctx context.Context, d *model.Device) error {
	query := `
		INSERT INTO devices (organization_id, name, fcm_token, phone_number, status, tags, last_seen_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'offline', $5, NOW(), NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	// Ensure tags is not nil for DB array
	tags := d.Tags
	if tags == nil {
		tags = []string{}
	}

	err := s.db.QueryRow(ctx, query, d.OrganizationID, d.Name, d.FCMToken, d.PhoneNumber, tags).Scan(&d.ID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to register device: %w", err)
	}
	return nil
}

func (s *Store) GetDevicesByOrganizationID(ctx context.Context, orgID int) ([]model.Device, error) {
	query := `
		SELECT id, organization_id, name, fcm_token, phone_number, status, tags, last_seen_at, created_at, updated_at
		FROM devices
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query devices: %w", err)
	}
	defer rows.Close()

	var devices []model.Device
	for rows.Next() {
		var d model.Device
		var tags []string // Use slice for scanning array via pgx
		if err := rows.Scan(&d.ID, &d.OrganizationID, &d.Name, &d.FCMToken, &d.PhoneNumber, &d.Status, &tags, &d.LastSeenAt, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}
		d.Tags = tags
		devices = append(devices, d)
	}
	return devices, nil
}

func (s *Store) GetDeviceByID(ctx context.Context, id int) (*model.Device, error) {
	query := `
		SELECT id, organization_id, name, fcm_token, phone_number, status, tags, last_seen_at, created_at, updated_at
		FROM devices
		WHERE id = $1
	`
	var d model.Device
	var tags []string
	err := s.db.QueryRow(ctx, query, id).Scan(&d.ID, &d.OrganizationID, &d.Name, &d.FCMToken, &d.PhoneNumber, &d.Status, &tags, &d.LastSeenAt, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}
	d.Tags = tags
	return &d, nil
}

func (s *Store) UpdateDeviceStatus(ctx context.Context, deviceID, orgID int, status string) error {
	query := `
		UPDATE devices 
		SET status = $1, last_seen_at = NOW(), updated_at = NOW()
		WHERE id = $2 AND organization_id = $3
	`
	_, err := s.db.Exec(ctx, query, status, deviceID, orgID)
	return err
}

func (s *Store) DeleteDevice(ctx context.Context, deviceID, orgID int) error {
	query := `DELETE FROM devices WHERE id = $1 AND organization_id = $2`
	result, err := s.db.Exec(ctx, query, deviceID, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete device: %w", err)
	}
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("device not found")
	}
	return nil
}
