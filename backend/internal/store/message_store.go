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
	msg.MaxRetries = maxRetries

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
	AppID           *int
	CampaignID      *int
	DeviceID        *int
	Status          *string
	FailureCategory *string
	Search          *string
	StartDate       *time.Time
	EndDate         *time.Time
	Limit           int
	Offset          int
}

func (s *Store) GetMessagesByOrganizationID(ctx context.Context, orgID int, filter MessageListFilter) ([]model.Message, error) {
	query := `
		SELECT
			m.id, m.organization_id, m.application_id, m.campaign_id, m.device_id, m.to_number, m.from_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at, m.scheduled_at, m.processed_at, m.retry_count, m.max_retries, m.last_error, m.last_error_code, m.failure_category, m.failed_at, m.last_attempted_at, m.metadata, m.sim_slot,
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
	if filter.DeviceID != nil {
		query += fmt.Sprintf(" AND m.device_id = $%d", argIdx)
		args = append(args, *filter.DeviceID)
		argIdx++
	}
	if filter.Status != nil && *filter.Status != "" {
		query += fmt.Sprintf(" AND m.status = $%d", argIdx)
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.FailureCategory != nil && *filter.FailureCategory != "" {
		query += fmt.Sprintf(" AND m.failure_category = $%d", argIdx)
		args = append(args, *filter.FailureCategory)
		argIdx++
	}
	if filter.Search != nil && *filter.Search != "" {
		query += fmt.Sprintf(" AND (m.to_number ILIKE $%d OR m.from_number ILIKE $%d OR m.body ILIKE $%d OR CAST(m.id AS TEXT) ILIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+*filter.Search+"%")
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
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filter.Limit)
		argIdx++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, filter.Offset)
	}

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
			&m.LastErrorCode,
			&m.FailureCategory,
			&m.FailedAt,
			&m.LastAttemptedAt,
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
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
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
			&m.RetryCount, &m.MaxRetries, &m.LastError, &m.LastErrorCode, &m.FailureCategory, &m.FailedAt, &m.LastAttemptedAt, &m.Metadata, &m.SimSlot,
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

func (s *Store) UpdateMessageStatusWithDiagnostics(ctx context.Context, msgID int, status string, lastError string, lastErrorCode *string, failureCategory *string) error {
	query := `
		UPDATE messages
		SET status = $1,
			last_error = $2,
			last_error_code = $3,
			failure_category = $4,
			failed_at = CASE WHEN $1 = 'failed' THEN NOW() ELSE NULL END,
			last_attempted_at = NOW(),
			updated_at = NOW()
		WHERE id = $5
	`
	_, err := s.db.Exec(ctx, query, status, lastError, lastErrorCode, failureCategory, msgID)
	return err
}

func (s *Store) GetMessageByID(ctx context.Context, msgID int) (*model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
		FROM messages 
		WHERE id = $1
	`
	var m model.Message
	var reqTags []string
	err := s.db.QueryRow(ctx, query, msgID).Scan(
		&m.ID, &m.OrganizationID, &m.ApplicationID, &m.CampaignID, &m.DeviceID, &m.ToNumber, &m.FromNumber, &m.Body, &m.Status, &m.Direction, &m.Priority,
		&reqTags,
		&m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.LastErrorCode, &m.FailureCategory, &m.FailedAt, &m.LastAttemptedAt, &m.Metadata, &m.SimSlot,
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
		SET retry_count = $1,
			last_error = $2,
			status = $3,
			device_id = NULL,
			last_attempted_at = NOW(),
			updated_at = NOW()
		WHERE id = $4
	`
	_, err := s.db.Exec(ctx, query, retryCount, lastError, status, msgID)
	return err
}

func (s *Store) UpdateMessageRetryWithDiagnostics(ctx context.Context, msgID int, retryCount int, lastError string, status string, lastErrorCode *string, failureCategory *string) error {
	query := `
		UPDATE messages
		SET retry_count = $1,
			last_error = $2,
			status = $3,
			device_id = NULL,
			last_error_code = $4,
			failure_category = $5,
			last_attempted_at = NOW(),
			updated_at = NOW()
		WHERE id = $6
	`
	_, err := s.db.Exec(ctx, query, retryCount, lastError, status, lastErrorCode, failureCategory, msgID)
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
		SELECT id, organization_id, application_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
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
			&m.LastErrorCode,
			&m.FailureCategory,
			&m.FailedAt,
			&m.LastAttemptedAt,
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
		SELECT id, organization_id, application_id, device_id, to_number, from_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
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
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.DeviceID, &m.ToNumber, &m.FromNumber, &m.Body, &m.Status, &m.Direction, &m.Priority, &reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.LastErrorCode, &m.FailureCategory, &m.FailedAt, &m.LastAttemptedAt, &m.Metadata, &m.SimSlot,
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
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
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
			&m.LastErrorCode,
			&m.FailureCategory,
			&m.FailedAt,
			&m.LastAttemptedAt,
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
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
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
			&m.LastErrorCode,
			&m.FailureCategory,
			&m.FailedAt,
			&m.LastAttemptedAt,
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
				m.id, m.organization_id, m.application_id, m.campaign_id, m.device_id, m.to_number, m.from_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at, m.scheduled_at, m.processed_at, m.retry_count, m.max_retries, m.last_error, m.last_error_code, m.failure_category, m.failed_at, m.last_attempted_at, m.metadata, m.sim_slot,
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
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.CampaignID, &m.DeviceID, &m.ToNumber, &m.FromNumber, &m.Body, &m.Status, &m.Direction, &m.Priority, &reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.LastErrorCode, &m.FailureCategory, &m.FailedAt, &m.LastAttemptedAt, &m.Metadata, &m.SimSlot,
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
		SELECT id, organization_id, application_id, campaign_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at, retry_count, max_retries, last_error, last_error_code, failure_category, failed_at, last_attempted_at, metadata, sim_slot
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
			&m.ID, &m.OrganizationID, &m.ApplicationID, &m.CampaignID, &m.DeviceID, &m.ToNumber, &m.Body, &m.Status, &m.Direction, &m.Priority, &reqTags, &m.CreatedAt, &m.UpdatedAt, &m.ScheduledAt, &m.ProcessedAt, &m.RetryCount, &m.MaxRetries, &m.LastError, &m.LastErrorCode, &m.FailureCategory, &m.FailedAt, &m.LastAttemptedAt, &m.Metadata, &m.SimSlot,
		); err != nil {
			return nil, fmt.Errorf("failed to scan stuck message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}

func (s *Store) CreateMessageEvent(ctx context.Context, event *model.MessageEvent) error {
	if event.Metadata == nil {
		event.Metadata = map[string]any{}
	}
	query := `
		INSERT INTO message_events (message_id, organization_id, application_id, device_id, sim_slot, event_type, status, attempt, source, reason_code, reason_message, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query,
		event.MessageID,
		event.OrganizationID,
		event.ApplicationID,
		event.DeviceID,
		event.SimSlot,
		event.EventType,
		event.Status,
		event.Attempt,
		event.Source,
		event.ReasonCode,
		event.ReasonMessage,
		event.Metadata,
	).Scan(&event.ID, &event.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create message event: %w", err)
	}
	return nil
}

func (s *Store) GetMessageEvents(ctx context.Context, msgID int) ([]model.MessageEvent, error) {
	query := `
		SELECT id, message_id, organization_id, application_id, device_id, sim_slot, event_type, status, attempt, source, reason_code, reason_message, metadata, created_at
		FROM message_events
		WHERE message_id = $1
		ORDER BY created_at ASC, id ASC
	`
	rows, err := s.db.Query(ctx, query, msgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query message events: %w", err)
	}
	defer rows.Close()

	var events []model.MessageEvent
	for rows.Next() {
		var event model.MessageEvent
		if err := rows.Scan(
			&event.ID,
			&event.MessageID,
			&event.OrganizationID,
			&event.ApplicationID,
			&event.DeviceID,
			&event.SimSlot,
			&event.EventType,
			&event.Status,
			&event.Attempt,
			&event.Source,
			&event.ReasonCode,
			&event.ReasonMessage,
			&event.Metadata,
			&event.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan message event: %w", err)
		}
		events = append(events, event)
	}
	return events, nil
}

func (s *Store) SearchSupportMessages(ctx context.Context, filter MessageListFilter, orgID *int) ([]model.SupportMessage, error) {
	query := `
		SELECT
			m.id, m.organization_id, m.application_id, m.campaign_id, m.device_id, m.to_number, m.from_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at, m.scheduled_at, m.processed_at, m.retry_count, m.max_retries, m.last_error, m.last_error_code, m.failure_category, m.failed_at, m.last_attempted_at, m.metadata, m.sim_slot,
			a.name as application_name,
			d.name as device_name,
			o.name as organization_name
		FROM messages m
		JOIN organizations o ON m.organization_id = o.id
		LEFT JOIN applications a ON m.application_id = a.id
		LEFT JOIN devices d ON m.device_id = d.id
		WHERE 1 = 1
	`
	args := []interface{}{}
	argIdx := 1

	if orgID != nil {
		query += fmt.Sprintf(" AND m.organization_id = $%d", argIdx)
		args = append(args, *orgID)
		argIdx++
	}
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
	if filter.DeviceID != nil {
		query += fmt.Sprintf(" AND m.device_id = $%d", argIdx)
		args = append(args, *filter.DeviceID)
		argIdx++
	}
	if filter.Status != nil && *filter.Status != "" {
		query += fmt.Sprintf(" AND m.status = $%d", argIdx)
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.FailureCategory != nil && *filter.FailureCategory != "" {
		query += fmt.Sprintf(" AND m.failure_category = $%d", argIdx)
		args = append(args, *filter.FailureCategory)
		argIdx++
	}
	if filter.Search != nil && *filter.Search != "" {
		query += fmt.Sprintf(" AND (m.to_number ILIKE $%d OR m.from_number ILIKE $%d OR m.body ILIKE $%d OR CAST(m.id AS TEXT) ILIKE $%d OR o.name ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+*filter.Search+"%")
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
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filter.Limit)
		argIdx++
	} else {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, 100)
		argIdx++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, filter.Offset)
	}

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query support messages: %w", err)
	}
	defer rows.Close()

	var messages []model.SupportMessage
	for rows.Next() {
		var sm model.SupportMessage
		var reqTags []string
		if err := rows.Scan(
			&sm.ID,
			&sm.OrganizationID,
			&sm.ApplicationID,
			&sm.CampaignID,
			&sm.DeviceID,
			&sm.ToNumber,
			&sm.FromNumber,
			&sm.Body,
			&sm.Status,
			&sm.Direction,
			&sm.Priority,
			&reqTags,
			&sm.CreatedAt,
			&sm.UpdatedAt,
			&sm.ScheduledAt,
			&sm.ProcessedAt,
			&sm.RetryCount,
			&sm.MaxRetries,
			&sm.LastError,
			&sm.LastErrorCode,
			&sm.FailureCategory,
			&sm.FailedAt,
			&sm.LastAttemptedAt,
			&sm.Metadata,
			&sm.SimSlot,
			&sm.ApplicationName,
			&sm.DeviceName,
			&sm.OrganizationName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan support message: %w", err)
		}
		sm.RequiredTags = reqTags
		messages = append(messages, sm)
	}
	return messages, nil
}
