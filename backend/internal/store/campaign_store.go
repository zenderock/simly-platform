package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateCampaign(ctx context.Context, c *model.Campaign) error {
	query := `
		INSERT INTO campaigns (organization_id, name, template_body, list_id, device_id, status, scheduled_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query,
		c.OrganizationID,
		c.Name,
		c.TemplateBody,
		c.ListID,
		c.DeviceID,
		c.Status,
		c.ScheduledAt,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create campaign: %w", err)
	}
	return nil
}

func (s *Store) UpdateCampaign(ctx context.Context, c *model.Campaign) error {
	query := `
		UPDATE campaigns
		SET name = $1, template_body = $2, list_id = $3, device_id = $4, status = $5, scheduled_at = $6, updated_at = NOW()
		WHERE id = $7 AND organization_id = $8
	`
	result, err := s.db.Exec(ctx, query,
		c.Name,
		c.TemplateBody,
		c.ListID,
		c.DeviceID,
		c.Status,
		c.ScheduledAt,
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
		SELECT id, organization_id, name, template_body, list_id, device_id, status, scheduled_at, total_messages, sent_messages, failed_messages, created_at, updated_at
		FROM campaigns
		WHERE id = $1
	`
	var c model.Campaign
	err := s.db.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.OrganizationID,
		&c.Name,
		&c.TemplateBody,
		&c.ListID,
		&c.DeviceID,
		&c.Status,
		&c.ScheduledAt,
		&c.TotalMessages,
		&c.SentMessages,
		&c.FailedMessages,
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
		SELECT id, organization_id, name, template_body, list_id, device_id, status, scheduled_at, total_messages, sent_messages, failed_messages, created_at, updated_at
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
			&c.Name,
			&c.TemplateBody,
			&c.ListID,
			&c.DeviceID,
			&c.Status,
			&c.ScheduledAt,
			&c.TotalMessages,
			&c.SentMessages,
			&c.FailedMessages,
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
			query := "INSERT INTO messages (organization_id, device_id, to_number, body, status, direction, campaign_id, created_at, updated_at) VALUES "
			vals := []interface{}{}

			for j, m := range batch {
				n := j * 7
				query += fmt.Sprintf("($%d, $%d, $%d, $%d, 'pending', 'outbound', $%d, NOW(), NOW())", n+1, n+2, n+3, n+4, n+5)
				vals = append(vals, orgID, deviceID, m.ToNumber, m.Body, campaignID)

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
