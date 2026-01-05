package store

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateCampaign(ctx context.Context, c *model.Campaign) error {
	query := `
		INSERT INTO campaigns (organization_id, application_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, send_window_start, send_window_end, use_all_devices, auto_reschedule, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query,
		c.OrganizationID,
		c.ApplicationID,
		c.Name,
		c.TemplateBody,
		c.ListID,
		c.DeviceID,
		c.SimSlot,
		c.Status,
		c.ScheduledAt,
		c.SendWindowStart,
		c.SendWindowEnd,
		c.UseAllDevices,
		c.AutoReschedule,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create campaign: %w", err)
	}
	return nil
}

func (s *Store) UpdateCampaign(ctx context.Context, c *model.Campaign) error {
	query := `
		UPDATE campaigns
		SET name = $1, template_body = $2, list_id = $3, device_id = $4, sim_slot = $5, status = $6, scheduled_at = $7, send_window_start = $8, send_window_end = $9, use_all_devices = $10, updated_at = NOW()
		WHERE id = $11 AND organization_id = $12
	`
	result, err := s.db.Exec(ctx, query,
		c.Name,
		c.TemplateBody,
		c.ListID,
		c.DeviceID,
		c.SimSlot,
		c.Status,
		c.ScheduledAt,
		c.SendWindowStart,
		c.SendWindowEnd,
		c.UseAllDevices,
		c.ID,
		c.OrganizationID,
	)
	if err != nil {
		return fmt.Errorf("failed to update campaign: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found or unauthorized")
	}
	return nil
}

func (s *Store) GetCampaignByID(ctx context.Context, id int) (*model.Campaign, error) {
	query := `
		SELECT id, organization_id, application_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, total_messages, sent_messages, failed_messages, send_window_start, send_window_end, pause_reason, estimated_completion_at, use_all_devices, auto_reschedule, created_at, updated_at
		FROM campaigns
		WHERE id = $1
	`
	var c model.Campaign
	err := s.db.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.OrganizationID,
		&c.ApplicationID,
		&c.Name,
		&c.TemplateBody,
		&c.ListID,
		&c.DeviceID,
		&c.SimSlot,
		&c.Status,
		&c.ScheduledAt,
		&c.TotalMessages,
		&c.SentMessages,
		&c.FailedMessages,
		&c.SendWindowStart,
		&c.SendWindowEnd,
		&c.PauseReason,
		&c.EstimatedCompletionAt,
		&c.UseAllDevices,
		&c.AutoReschedule,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}
	return &c, nil
}

func (s *Store) ListCampaigns(ctx context.Context, orgID int) ([]model.Campaign, error) {
	query := `
		SELECT id, organization_id, application_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, total_messages, sent_messages, failed_messages, send_window_start, send_window_end, pause_reason, estimated_completion_at, use_all_devices, created_at, updated_at
		FROM campaigns
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns: %w", err)
	}
	defer rows.Close()

	var campaigns []model.Campaign
	for rows.Next() {
		var c model.Campaign
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.ApplicationID,
			&c.Name,
			&c.TemplateBody,
			&c.ListID,
			&c.DeviceID,
			&c.SimSlot,
			&c.Status,
			&c.ScheduledAt,
			&c.TotalMessages,
			&c.SentMessages,
			&c.FailedMessages,
			&c.SendWindowStart,
			&c.SendWindowEnd,
			&c.PauseReason,
			&c.EstimatedCompletionAt,
			&c.UseAllDevices,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

func (s *Store) ListCampaignsByApplication(ctx context.Context, appID int) ([]model.Campaign, error) {
	query := `
		SELECT id, organization_id, application_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, total_messages, sent_messages, failed_messages, send_window_start, send_window_end, pause_reason, estimated_completion_at, use_all_devices, created_at, updated_at
		FROM campaigns
		WHERE application_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, appID)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns by application: %w", err)
	}
	defer rows.Close()

	var campaigns []model.Campaign
	for rows.Next() {
		var c model.Campaign
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.ApplicationID,
			&c.Name,
			&c.TemplateBody,
			&c.ListID,
			&c.DeviceID,
			&c.SimSlot,
			&c.Status,
			&c.ScheduledAt,
			&c.TotalMessages,
			&c.SentMessages,
			&c.FailedMessages,
			&c.SendWindowStart,
			&c.SendWindowEnd,
			&c.PauseReason,
			&c.EstimatedCompletionAt,
			&c.UseAllDevices,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

func (s *Store) ListCampaignsByStatus(ctx context.Context, orgID int, status string) ([]model.Campaign, error) {
	query := `
		SELECT id, organization_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, total_messages, sent_messages, failed_messages, send_window_start, send_window_end, pause_reason, estimated_completion_at, use_all_devices, created_at, updated_at
		FROM campaigns
		WHERE organization_id = $1 AND status = $2
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID, status)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns by status: %w", err)
	}
	defer rows.Close()

	var campaigns []model.Campaign
	for rows.Next() {
		var c model.Campaign
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.Name,
			&c.TemplateBody,
			&c.ListID,
			&c.DeviceID,
			&c.SimSlot,
			&c.Status,
			&c.ScheduledAt,
			&c.TotalMessages,
			&c.SentMessages,
			&c.FailedMessages,
			&c.SendWindowStart,
			&c.SendWindowEnd,
			&c.PauseReason,
			&c.EstimatedCompletionAt,
			&c.UseAllDevices,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

func (s *Store) DeleteCampaign(ctx context.Context, id, orgID int) error {
	result, err := s.db.Exec(ctx, "DELETE FROM campaigns WHERE id = $1 AND organization_id = $2", id, orgID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found or unauthorized")
	}
	return nil
}

func (s *Store) UpdateCampaignStatus(ctx context.Context, id int, status string) error {
	_, err := s.db.Exec(ctx, "UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	return err
}

func (s *Store) IncrementCampaignStats(ctx context.Context, id int, sentDelta, failedDelta int) error {
	query := `
		UPDATE campaigns 
		SET sent_messages = sent_messages + $1, 
			failed_messages = failed_messages + $2,
			updated_at = NOW()
		WHERE id = $3
	`
	_, err := s.db.Exec(ctx, query, sentDelta, failedDelta, id)
	return err
}

// GetPendingMessagesForCampaign retrieves all pending messages for a campaign.
func (s *Store) GetPendingMessagesForCampaign(ctx context.Context, campaignID int) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, device_id, to_number, body, status, direction, created_at, updated_at
		FROM messages
		WHERE campaign_id = $1 AND status = 'pending'
	`
	rows, err := s.db.Query(ctx, query, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending campaign messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(
			&m.ID,
			&m.OrganizationID,
			&m.DeviceID,
			&m.ToNumber,
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.CreatedAt,
			&m.UpdatedAt,
		); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, nil
}

// GetQueuedMessagesForCampaign retrieves all queued messages for a campaign.
func (s *Store) GetQueuedMessagesForCampaign(ctx context.Context, campaignID int) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, device_id, to_number, body, status, direction, created_at, updated_at, sim_slot, max_retries
		FROM messages
		WHERE campaign_id = $1 AND status = 'queued'
	`
	rows, err := s.db.Query(ctx, query, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get queued campaign messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(
			&m.ID,
			&m.OrganizationID,
			&m.DeviceID,
			&m.ToNumber,
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.SimSlot,
			&m.MaxRetries,
		); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, nil
}
func (s *Store) BulkCreateMessagesForCampaign(ctx context.Context, campaignID, orgID, deviceID int, messages []model.Message) error {
	if len(messages) == 0 {
		return nil
	}

	return s.ExecTx(ctx, func(tx *Store) error {
		// Chunk size 500
		const chunkSize = 500

		for i := 0; i < len(messages); i += chunkSize {
			end := i + chunkSize
			if end > len(messages) {
				end = len(messages)
			}

			batch := messages[i:end]
			if len(batch) == 0 {
				continue
			}

			// Build Query
			query := "INSERT INTO messages (organization_id, device_id, sim_slot, to_number, body, status, direction, campaign_id, created_at, updated_at) VALUES "
			vals := []interface{}{}

			// Convert deviceID to nullable pointer
			var deviceIDPtr *int
			if deviceID != 0 {
				deviceIDPtr = &deviceID
			}

			for j, m := range batch {
				n := j * 6
				query += fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, 'queued', 'outbound', $%d, NOW(), NOW())", n+1, n+2, n+3, n+4, n+5, n+6)

				// Use message-specific deviceID if set, otherwise fallback to campaign default
				dID := deviceIDPtr
				if m.DeviceID != nil {
					dID = m.DeviceID
				}

				vals = append(vals, orgID, dID, m.SimSlot, m.ToNumber, m.Body, campaignID)

				if j < len(batch)-1 {
					query += ","
				}
			}

			_, err := tx.db.Exec(ctx, query, vals...)
			if err != nil {
				return fmt.Errorf("failed to bulk insert campaign messages batch %d: %w", i, err)
			}
		}

		// Update Total Count
		_, err := tx.db.Exec(ctx, "UPDATE campaigns SET total_messages = $1 WHERE id = $2", len(messages), campaignID)
		if err != nil {
			return fmt.Errorf("failed to update campaign total count: %w", err)
		}

		return nil
	})
}
func (s *Store) GetCampaignAnalytics(ctx context.Context, campaignID int) (*model.CampaignAnalytics, error) {
	query := `
		SELECT 
			COALESCE(COUNT(*), 0) as total,
			COALESCE(COUNT(*) FILTER (WHERE status = 'sent'), 0) as sent,
			COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0) as failed,
			COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0) as pending,
			COALESCE(COUNT(*) FILTER (WHERE status = 'delivered'), 0) as delivered
		FROM messages
		WHERE campaign_id = $1
	`
	var a model.CampaignAnalytics
	a.CampaignID = campaignID
	err := s.db.QueryRow(ctx, query, campaignID).Scan(
		&a.Total,
		&a.Sent,
		&a.Failed,
		&a.Pending,
		&a.Delivered,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign analytics: %w", err)
	}

	// Get breakdown by status
	statusQuery := `SELECT status, COUNT(*) FROM messages WHERE campaign_id = $1 GROUP BY status`
	rows, err := s.db.Query(ctx, statusQuery, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	a.ByStatus = make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		a.ByStatus[status] = count
	}

	return &a, nil
}

// UpdateCampaignPauseReason updates the pause reason for a campaign
func (s *Store) UpdateCampaignPauseReason(ctx context.Context, campaignID int, reason string) error {
	var pauseReason *string
	if reason != "" {
		pauseReason = &reason
	}
	query := `UPDATE campaigns SET pause_reason = $1, updated_at = NOW() WHERE id = $2`
	_, err := s.db.Exec(ctx, query, pauseReason, campaignID)
	return err
}

// UpdateCampaignEstimatedCompletion updates the estimated completion time for a campaign
func (s *Store) UpdateCampaignEstimatedCompletion(ctx context.Context, campaignID int, estimatedAt time.Time) error {
	query := `UPDATE campaigns SET estimated_completion_at = $1, updated_at = NOW() WHERE id = $2`
	_, err := s.db.Exec(ctx, query, estimatedAt, campaignID)
	return err
}

// UpdateCampaignFinalStats updates the final sent and failed counts for a campaign
func (s *Store) UpdateCampaignFinalStats(ctx context.Context, campaignID int, sent, failed int) error {
	query := `UPDATE campaigns SET sent_messages = $1, failed_messages = $2, updated_at = NOW() WHERE id = $3`
	_, err := s.db.Exec(ctx, query, sent, failed, campaignID)
	return err
}

// GetProcessingCampaigns returns all campaigns in processing status
func (s *Store) GetProcessingCampaigns(ctx context.Context) ([]model.Campaign, error) {
	query := `
		SELECT id, organization_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, total_messages, sent_messages, failed_messages, send_window_start, send_window_end, pause_reason, estimated_completion_at, use_all_devices, created_at, updated_at
		FROM campaigns
		WHERE status = 'processing'
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get processing campaigns: %w", err)
	}
	defer rows.Close()

	var campaigns []model.Campaign
	for rows.Next() {
		var c model.Campaign
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.Name,
			&c.TemplateBody,
			&c.ListID,
			&c.DeviceID,
			&c.SimSlot,
			&c.Status,
			&c.ScheduledAt,
			&c.TotalMessages,
			&c.SentMessages,
			&c.FailedMessages,
			&c.SendWindowStart,
			&c.SendWindowEnd,
			&c.PauseReason,
			&c.EstimatedCompletionAt,
			&c.UseAllDevices,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan processing campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

// CampaignMessageStats holds message counts by status for a campaign
type CampaignMessageStats struct {
	Total     int
	Queued    int
	Pending   int
	Sent      int
	Delivered int
	Failed    int
}

// GetCampaignMessageStats returns message counts by status for a campaign
func (s *Store) GetCampaignMessageStats(ctx context.Context, campaignID int) (*CampaignMessageStats, error) {
	query := `
		SELECT 
			COALESCE(COUNT(*), 0) as total,
			COALESCE(COUNT(*) FILTER (WHERE status = 'queued'), 0) as queued,
			COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0) as pending,
			COALESCE(COUNT(*) FILTER (WHERE status = 'sent'), 0) as sent,
			COALESCE(COUNT(*) FILTER (WHERE status = 'delivered'), 0) as delivered,
			COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0) as failed
		FROM messages
		WHERE campaign_id = $1
	`
	var stats CampaignMessageStats
	err := s.db.QueryRow(ctx, query, campaignID).Scan(
		&stats.Total,
		&stats.Queued,
		&stats.Pending,
		&stats.Sent,
		&stats.Delivered,
		&stats.Failed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign message stats: %w", err)
	}
	return &stats, nil
}

func (s *Store) CountCampaignsByOrganization(ctx context.Context, orgID int) (int, error) {
	query := `SELECT COUNT(*) FROM campaigns WHERE organization_id = $1`
	var count int
	err := s.db.QueryRow(ctx, query, orgID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count campaigns: %w", err)
	}
	return count, nil
}

// GetDueScheduledCampaigns returns campaigns that are scheduled and due for execution
func (s *Store) GetDueScheduledCampaigns(ctx context.Context) ([]model.Campaign, error) {
	query := `
		SELECT id, organization_id, name, template_body, list_id, device_id, sim_slot, status, scheduled_at, total_messages, sent_messages, failed_messages, send_window_start, send_window_end, pause_reason, estimated_completion_at, use_all_devices, created_at, updated_at
		FROM campaigns
		WHERE status = 'scheduled' AND scheduled_at <= NOW()
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get due scheduled campaigns: %w", err)
	}
	defer rows.Close()

	var campaigns []model.Campaign
	for rows.Next() {
		var c model.Campaign
		if err := rows.Scan(
			&c.ID,
			&c.OrganizationID,
			&c.Name,
			&c.TemplateBody,
			&c.ListID,
			&c.DeviceID,
			&c.SimSlot,
			&c.Status,
			&c.ScheduledAt,
			&c.TotalMessages,
			&c.SentMessages,
			&c.FailedMessages,
			&c.SendWindowStart,
			&c.SendWindowEnd,
			&c.PauseReason,
			&c.EstimatedCompletionAt,
			&c.UseAllDevices,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan scheduled campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}
