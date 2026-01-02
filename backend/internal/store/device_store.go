package store

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateDevice(ctx context.Context, d *model.Device) error {
	query := `
		INSERT INTO devices (organization_id, name, model, fcm_token, status, battery_level, signal_strength, tags, last_seen_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'offline', $5, $6, $7, NOW(), NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	tags := d.Tags
	if tags == nil {
		tags = []string{}
	}

	err := s.db.QueryRow(ctx, query, d.OrganizationID, d.Name, d.Model, d.FCMToken, d.BatteryLevel, d.SignalStrength, tags).Scan(&d.ID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to register device: %w", err)
	}

	// Create SIM cards if provided
	for i := range d.SimCards {
		d.SimCards[i].DeviceID = d.ID
		if err := s.CreateSimCard(ctx, &d.SimCards[i]); err != nil {
			return fmt.Errorf("failed to create sim card: %w", err)
		}
	}

	return nil
}

func (s *Store) CreateSimCard(ctx context.Context, sim *model.SimCard) error {
	query := `
		INSERT INTO device_sims (device_id, slot_index, phone_number, operator, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id
	`
	return s.db.QueryRow(ctx, query, sim.DeviceID, sim.SlotIndex, sim.PhoneNumber, sim.Operator, sim.IsActive).Scan(&sim.ID)
}

func (s *Store) GetDevicesByOrganizationID(ctx context.Context, orgID int) ([]model.Device, error) {
	query := `
		SELECT id, organization_id, name, model, fcm_token, status, battery_level, signal_strength, tags, last_seen_at, created_at, updated_at
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
		var tags []string
		if err := rows.Scan(&d.ID, &d.OrganizationID, &d.Name, &d.Model, &d.FCMToken, &d.Status, &d.BatteryLevel, &d.SignalStrength, &tags, &d.LastSeenAt, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}
		d.Tags = tags

		// Fetch SIMs for this device
		sims, err := s.GetSimCardsByDeviceID(ctx, d.ID)
		if err != nil {
			return nil, err
		}
		d.SimCards = sims

		devices = append(devices, d)
	}
	return devices, nil
}

func (s *Store) GetSimCardsByDeviceID(ctx context.Context, deviceID int) ([]model.SimCard, error) {
	query := `
		SELECT id, device_id, slot_index, phone_number, operator, is_active
		FROM device_sims
		WHERE device_id = $1
		ORDER BY slot_index ASC
	`
	rows, err := s.db.Query(ctx, query, deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query sim cards: %w", err)
	}
	defer rows.Close()

	var sims []model.SimCard
	for rows.Next() {
		var sim model.SimCard
		if err := rows.Scan(&sim.ID, &sim.DeviceID, &sim.SlotIndex, &sim.PhoneNumber, &sim.Operator, &sim.IsActive); err != nil {
			return nil, fmt.Errorf("failed to scan sim card: %w", err)
		}
		sims = append(sims, sim)
	}
	return sims, nil
}

func (s *Store) GetDeviceByID(ctx context.Context, id int) (*model.Device, error) {
	query := `
		SELECT id, organization_id, name, model, fcm_token, status, battery_level, signal_strength, tags, last_seen_at, created_at, updated_at
		FROM devices
		WHERE id = $1
	`
	var d model.Device
	var tags []string
	err := s.db.QueryRow(ctx, query, id).Scan(&d.ID, &d.OrganizationID, &d.Name, &d.Model, &d.FCMToken, &d.Status, &d.BatteryLevel, &d.SignalStrength, &tags, &d.LastSeenAt, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}
	d.Tags = tags

	sims, err := s.GetSimCardsByDeviceID(ctx, d.ID)
	if err != nil {
		return nil, err
	}
	d.SimCards = sims

	return &d, nil
}

func (s *Store) UpdateDeviceHealth(ctx context.Context, deviceID int, battery int, signal int, status string) error {
	query := `
		UPDATE devices 
		SET battery_level = $1, signal_strength = $2, status = $3, last_seen_at = NOW(), updated_at = NOW()
		WHERE id = $4
	`
	_, err := s.db.Exec(ctx, query, battery, signal, status, deviceID)
	return err
}

func (s *Store) UpdateDeviceSimCards(ctx context.Context, deviceID int, simCards []model.UpdateSimCardRequest) error {
	return s.ExecTx(ctx, func(tx *Store) error {
		// Delete existing SIM cards for this device
		_, err := tx.db.Exec(ctx, "DELETE FROM device_sims WHERE device_id = $1", deviceID)
		if err != nil {
			return err
		}

		// Insert new SIM cards
		for _, sim := range simCards {
			query := `
				INSERT INTO device_sims (device_id, slot_index, phone_number, operator, is_active, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
			`
			_, err = tx.db.Exec(ctx, query, deviceID, sim.SlotIndex, sim.PhoneNumber, sim.Operator, sim.IsActive)
			if err != nil {
				return err
			}
		}

		return nil
	})
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

func (s *Store) CountDevicesByOrganization(ctx context.Context, orgID int) (int, error) {
	query := `SELECT COUNT(*) FROM devices WHERE organization_id = $1`
	var count int
	err := s.db.QueryRow(ctx, query, orgID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count devices: %w", err)
	}
	return count, nil
}

func (s *Store) CountSimsByDevice(ctx context.Context, deviceID int) (int, error) {
	query := `SELECT COUNT(*) FROM device_sims WHERE device_id = $1`
	var count int
	err := s.db.QueryRow(ctx, query, deviceID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count SIMs: %w", err)
	}
	return count, nil
}

// Device Link Token functions

func (s *Store) CreateDeviceLinkToken(ctx context.Context, orgID int, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO device_link_tokens (organization_id, token, expires_at, created_at)
		VALUES ($1, $2, $3, NOW())
	`
	_, err := s.db.Exec(ctx, query, orgID, token, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to create device link token: %w", err)
	}
	return nil
}

func (s *Store) GetDeviceLinkToken(ctx context.Context, token string) (*model.DeviceLinkTokenFull, error) {
	query := `
		SELECT id, organization_id, token, expires_at, used_at, device_id, created_at
		FROM device_link_tokens
		WHERE token = $1
	`
	var t model.DeviceLinkTokenFull
	err := s.db.QueryRow(ctx, query, token).Scan(
		&t.ID, &t.OrganizationID, &t.Token, &t.ExpiresAt, &t.UsedAt, &t.DeviceID, &t.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get device link token '%s': %w", token, err)
	}
	return &t, nil
}

func (s *Store) MarkDeviceLinkTokenUsed(ctx context.Context, token string, deviceID int) error {
	query := `
		UPDATE device_link_tokens 
		SET used_at = NOW(), device_id = $1
		WHERE token = $2
	`
	_, err := s.db.Exec(ctx, query, deviceID, token)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}
	return nil
}

func (s *Store) DeleteExpiredLinkTokens(ctx context.Context, orgID int) error {
	query := `DELETE FROM device_link_tokens WHERE organization_id = $1 AND expires_at < NOW() AND used_at IS NULL`
	_, err := s.db.Exec(ctx, query, orgID)
	return err
}
func (s *Store) GetInactiveDevices(ctx context.Context, threshold time.Duration) ([]model.Device, error) {
	query := `
		SELECT id, organization_id, name, model, last_seen_at, status
		FROM devices
		WHERE status = 'online' AND last_seen_at < $1
	`
	cutoff := time.Now().Add(-threshold)
	rows, err := s.db.Query(ctx, query, cutoff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []model.Device
	for rows.Next() {
		var d model.Device
		if err := rows.Scan(&d.ID, &d.OrganizationID, &d.Name, &d.Model, &d.LastSeenAt, &d.Status); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (s *Store) UpdateDeviceStatus(ctx context.Context, id int, status string) error {
	query := `UPDATE devices SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := s.db.Exec(ctx, query, status, id)
	return err
}
func (s *Store) GetDeviceByName(ctx context.Context, orgID int, name string) (*model.Device, error) {
	query := `
		SELECT id, organization_id, name, model, fcm_token, status, battery_level, signal_strength, tags, last_seen_at, created_at, updated_at
		FROM devices
		WHERE organization_id = $1 AND name = $2
	`
	var d model.Device
	var tags []string
	err := s.db.QueryRow(ctx, query, orgID, name).Scan(&d.ID, &d.OrganizationID, &d.Name, &d.Model, &d.FCMToken, &d.Status, &d.BatteryLevel, &d.SignalStrength, &tags, &d.LastSeenAt, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}
	d.Tags = tags
	return &d, nil
}

func (s *Store) UpdateDevice(ctx context.Context, d *model.Device) error {
	query := `
		UPDATE devices 
		SET organization_id=$1, name=$2, model=$3, fcm_token=$4, status=$5, battery_level=$6, signal_strength=$7, tags=$8, last_seen_at=$9, updated_at=NOW()
		WHERE id=$10
	`
	tags := d.Tags
	if tags == nil {
		tags = []string{}
	}
	_, err := s.db.Exec(ctx, query, d.OrganizationID, d.Name, d.Model, d.FCMToken, d.Status, d.BatteryLevel, d.SignalStrength, tags, d.LastSeenAt, d.ID)
	return err
}
