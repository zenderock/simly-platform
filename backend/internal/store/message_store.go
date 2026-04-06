package store

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateMessage(ctx context.Context, msg *model.Message) error {
	query := `
		INSERT INTO messages (organization_id, application_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, metadata, sim_slot)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, updated_at
	`

	priority := msg.Priority
	if priority == "" {
		priority = "normal"
	}

	reqTags := msg.RequiredTags
	if reqTags == nil {
		reqTags = []string{}
	}

	maxRetries := msg.MaxRetries
	if maxRetries == 0 {
		maxRetries = 3
	}

	metadata := msg.Metadata
	if metadata == nil {
		metadata = make(map[string]interface{})
	}

	err := s.db.QueryRow(ctx, query,
		msg.OrganizationID,
		msg.ApplicationID,
		msg.DeviceID,
		msg.ToNumber,
		msg.FromNumber,
		msg.Body,
		msg.Status,
		msg.Direction,
		priority,
		reqTags,
		msg.ScheduledAt,
		msg.ProcessedAt,
		msg.RetryCount,
		maxRetries,
		metadata,
		msg.SimSlot,
	).Scan(&msg.ID, &msg.CreatedAt, &msg.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create message: %w", err)
	}
	return nil
}

// MessageListFilter holds optional filters for listing messages.
type MessageListFilter struct {
	AppID      *int
	CampaignID *int
	StartDate  *time.Time
	EndDate    *time.Time
}

func (s *Store) GetMessagesByOrganizationID(ctx context.Context, orgID int, filter MessageListFilter) ([]model.Message, error) {
	query := `
		SELECT
			m.id, m.organization_id, m.application_id, m.campaign_id, m.device_id, m.to_number, m.from_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at, m.scheduled_at, m.processed_at, m.retry_count, m.max_retries, m.last_error, m.metadata, m.sim_slot,
			a.name as application_name,
			d.name as device_name
		FROM messages m
		LEFT JOIN applications a ON m.application_id = a.id
		LEFT JOIN devices d ON m.device_id = d.id
		WHERE m.organization_id = $1
	`
	args := []interface{}{orgID}
	argIdx := 2

	if filter.AppID != nil {
		query += fmt.Sprintf(" AND m.application_id = $%d", argIdx)
		args = append(args, *filter.AppID)
		argIdx++
	}
	if filter.CampaignID != nil {
		query += fmt.Sprintf(" AND m.campaign_id = $%d", argIdx)
		args = append(args, *filter.CampaignID)
		argIdx++
	}
	if filter.StartDate != nil {
		query += fmt.Sprintf(" AND m.created_at >= $%d", argIdx)
		args = append(args, *filter.StartDate)
		argIdx++
	}
	if filter.EndDate != nil {
		query += fmt.Sprintf(" AND m.created_at <= $%d", argIdx)
		args = append(args, *filter.EndDate)
		argIdx++
	}
	query += " ORDER BY m.created_at DESC"

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID,
			&m.OrganizationID,
			&m.ApplicationID,
			&m.CampaignID,
			&m.DeviceID,
			&m.ToNumber,
			&m.FromNumber,
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.Priority,
			&reqTags,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.ScheduledAt,
			&m.ProcessedAt,
			&m.RetryCount,
			&m.MaxRetries,
			&m.LastError,
			&m.Metadata,
			&m.SimSlot,
			&m.ApplicationName,
			&m.DeviceName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

// GetQueuedMessagesByFilter fetches queued messages scoped by org + optional app/campaign/date range.
// Used by the bulk requeue endpoint.
func (s *Store) GetQueuedMessagesByFilter(ctx context.Context, orgID int, filter MessageListFilter) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages
		WHERE status = 'queued' AND organization_id = $1
	`
	args := []interface{}{orgID}
	argIdx := 2

	if filter.AppID != nil {
		query += fmt.Sprintf(" AND application_id = $%d", argIdx)
		args = append(args, *filter.AppID)
		argIdx++
	}
	if filter.CampaignID != nil {
		query += fmt.Sprintf(" AND campaign_id = $%d", argIdx)
		args = append(args, *filter.CampaignID)
		argIdx++
	}
	if filter.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, *filter.StartDate)
		argIdx++
	}
	if filter.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, *filter.EndDate)
		argIdx++
	}
	query += " ORDER BY created_at ASC"

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query queued messages by filter: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.CampaignID, &m.DeviceID,
			&m.ToNumber, &m.Body, &m.Status, &m.Direction, &m.Priority,
			&reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt,
			&m.RetryCount, &m.MaxRetries, &m.LastError, &m.Metadata, &m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan queued message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

// TouchMessageUpdatedAt bumps updated_at without changing status — prevents watchdog from
// immediately re-picking a message that was just re-enqueued.
func (s *Store) TouchMessageUpdatedAt(ctx context.Context, msgID int) error {
	_, err := s.db.Exec(ctx, `UPDATE messages SET updated_at = NOW() WHERE id = $1`, msgID)
	return err
}
func (s *Store) UpdateMessageStatus(ctx context.Context, msgID int, status string, lastError string) error {
	query := `UPDATE messages SET status = $1, last_error = $2, updated_at = NOW() WHERE id = $3`
	_, err := s.db.Exec(ctx, query, status, lastError, msgID)
	return err
}

func (s *Store) GetMessageByID(ctx context.Context, msgID int) (*model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages 
		WHERE id = $1
	`
	var m model.Message
	var reqTags []string
	err := s.db.QueryRow(ctx, query, msgID).Scan(
		&m.ID, &m.OrganizationID, &m.ApplicationID, &m.DeviceID, &m.ToNumber, &m.FromNumber, &m.Body, &m.Status, &m.Direction, &m.Priority,
		&reqTags,
		&m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.Metadata, &m.SimSlot,
	)
	if err != nil {
		return nil, err
	}
	m.RequiredTags = reqTags
	return &m, nil
}

func (s *Store) UpdateMessageRetry(ctx context.Context, msgID int, retryCount int, lastError string, status string) error {
	query := `
		UPDATE messages 
		SET retry_count = $1, last_error = $2, status = $3, device_id = NULL, updated_at = NOW() 
		WHERE id = $4
	`
	_, err := s.db.Exec(ctx, query, retryCount, lastError, status, msgID)
	return err
}

func (s *Store) UpdateMessageDeviceAndSlot(ctx context.Context, msgID int, deviceID int, simSlot *int) error {
	query := `UPDATE messages SET device_id = $1, sim_slot = $2, updated_at = NOW() WHERE id = $3`
	_, err := s.db.Exec(ctx, query, deviceID, simSlot, msgID)
	return err
}

func (s *Store) RequeueMessagesByDeviceID(ctx context.Context, deviceID int) (int64, error) {
	query := `
		UPDATE messages 
		SET status = 'pending', device_id = NULL, updated_at = NOW() 
		WHERE device_id = $1 AND status = 'pending'
	`
	result, err := s.db.Exec(ctx, query, deviceID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (s *Store) GetDueScheduledMessages(ctx context.Context) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages
		WHERE status = 'scheduled' AND scheduled_at <= NOW()
		ORDER BY scheduled_at ASC
		LIMIT 50
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query due messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID,
			&m.OrganizationID,
			&m.ApplicationID,
			&m.DeviceID,
			&m.ToNumber,
			&m.FromNumber,
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.Priority,
			&reqTags,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.ScheduledAt,
			&m.ProcessedAt,
			&m.RetryCount,
			&m.MaxRetries,
			&m.LastError,
			&m.Metadata,
			&m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan due message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}
func (s *Store) GetPendingMessagesByDeviceID(ctx context.Context, deviceID int) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages
		WHERE device_id = $1 AND status = 'pending'
		ORDER BY priority DESC, created_at ASC
		LIMIT 20
	`
	rows, err := s.db.Query(ctx, query, deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.DeviceID, &m.ToNumber, &m.FromNumber, &m.Body, &m.Status, &m.Direction, &m.Priority, &reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.Metadata, &m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan pending message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

// GetQueuedMessages fetches a batch of queued messages ordered by priority and created_at
func (s *Store) GetQueuedMessages(ctx context.Context, limit int) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages
		WHERE status = 'queued'
		ORDER BY 
			CASE priority 
				WHEN 'high' THEN 1 
				WHEN 'normal' THEN 2 
				WHEN 'low' THEN 3 
				ELSE 2 
			END,
			created_at ASC
		LIMIT $1
	`
	rows, err := s.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query queued messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID,
			&m.OrganizationID,
			&m.ApplicationID,
			&m.CampaignID,
			&m.DeviceID,
			&m.ToNumber,
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.Priority,
			&reqTags,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.ScheduledAt,
			&m.ProcessedAt,
			&m.RetryCount,
			&m.MaxRetries,
			&m.LastError,
			&m.Metadata,
			&m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan queued message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

// GetQueuedMessagesByOrganization fetches a batch of queued messages for a specific organization
// ordered by priority and created_at. This is useful for send window checks.
func (s *Store) GetQueuedMessagesByOrganization(ctx context.Context, orgID int, limit int) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages
		WHERE status = 'queued' AND organization_id = $1
		ORDER BY 
			CASE priority 
				WHEN 'high' THEN 1 
				WHEN 'normal' THEN 2 
				WHEN 'low' THEN 3 
				ELSE 2 
			END,
			created_at ASC
		LIMIT $2
	`
	rows, err := s.db.Query(ctx, query, orgID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query queued messages by organization: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID,
			&m.OrganizationID,
			&m.ApplicationID,
			&m.CampaignID,
			&m.DeviceID,
			&m.ToNumber,
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.Priority,
			&reqTags,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.ScheduledAt,
			&m.ProcessedAt,
			&m.RetryCount,
			&m.MaxRetries,
			&m.LastError,
			&m.Metadata,
			&m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan queued message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

// UpdateMessageDispatchInfo updates the device assignment, sim slot, and status for a message
func (s *Store) UpdateMessageDispatchInfo(ctx context.Context, msgID int, deviceID int, simSlot int, status string) error {
	query := `UPDATE messages SET device_id = $1, sim_slot = $2, status = $3, updated_at = NOW() WHERE id = $4`
	_, err := s.db.Exec(ctx, query, deviceID, simSlot, status, msgID)
	return err
}

// UpdateMessageFromNumber updates the from_number field for a message
func (s *Store) UpdateMessageFromNumber(ctx context.Context, msgID int, fromNumber string) error {
	query := `UPDATE messages SET from_number = $1, updated_at = NOW() WHERE id = $2`
	_, err := s.db.Exec(ctx, query, fromNumber, msgID)
	return err
}

// GetMessagesByCampaignID fetches messages associated with a specific campaign
func (s *Store) GetMessagesByCampaignID(ctx context.Context, campaignID int, limit int) ([]model.Message, error) {
	query := `
		SELECT 
			m.id, m.organization_id, m.application_id, m.campaign_id, m.device_id, m.to_number, m.from_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at, m.scheduled_at, m.processed_at, m.retry_count, m.max_retries, m.last_error, m.metadata, m.sim_slot,
			d.name as device_name
		FROM messages m
		LEFT JOIN devices d ON m.device_id = d.id
		WHERE m.campaign_id = $1
		ORDER BY m.created_at DESC
		LIMIT $2
	`
	rows, err := s.db.Query(ctx, query, campaignID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.CampaignID, &m.DeviceID, &m.ToNumber, &m.FromNumber, &m.Body, &m.Status, &m.Direction, &m.Priority, &reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.Metadata, &m.SimSlot,
			&m.DeviceName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

// GetStuckMessages fetches messages that have been in 'queued' status since before the cutoff time
func (s *Store) GetStuckMessages(ctx context.Context, cutoffTime interface{}, limit int) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, metadata, sim_slot
		FROM messages
		WHERE status = 'queued' AND updated_at < $1
		ORDER BY created_at ASC
		LIMIT $2
	`
	rows, err := s.db.Query(ctx, query, cutoffTime, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query stuck messages: %w", err)
	}
	defer rows.Close()

	var messages []model.Message
	for rows.Next() {
		var m model.Message
		var reqTags []string
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.CampaignID, &m.DeviceID, &m.ToNumber, &m.Body, &m.Status, &m.Direction, &m.Priority, &reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.Metadata, &m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan stuck message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}
