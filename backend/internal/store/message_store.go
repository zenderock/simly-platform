package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateMessage(ctx context.Context, msg *model.Message) error {
	query := `
		INSERT INTO messages (organization_id, application_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11)
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

	err := s.db.QueryRow(ctx, query,
		msg.OrganizationID,
		msg.ApplicationID,
		msg.DeviceID,
		msg.ToNumber,
		msg.Body,
		msg.Status,
		msg.Direction,
		priority,
		reqTags,
		msg.ScheduledAt,
		msg.ProcessedAt,
	).Scan(&msg.ID, &msg.CreatedAt, &msg.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create message: %w", err)
	}
	return nil
}

func (s *Store) GetMessagesByOrganizationID(ctx context.Context, orgID int, appID *int) ([]model.Message, error) {
	query := `
		SELECT 
			m.id, m.organization_id, m.application_id, m.device_id, m.to_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at, m.scheduled_at, m.processed_at,
			a.name as application_name,
			d.name as device_name
		FROM messages m
		LEFT JOIN applications a ON m.application_id = a.id
		LEFT JOIN devices d ON m.device_id = d.id
		WHERE m.organization_id = $1
	`
	args := []interface{}{orgID}
	if appID != nil {
		query += " AND m.application_id = $2"
		args = append(args, *appID)
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
func (s *Store) UpdateMessageStatus(ctx context.Context, msgID int, status string) error {
	query := `UPDATE messages SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := s.db.Exec(ctx, query, status, msgID)
	return err
}

func (s *Store) GetMessageByID(ctx context.Context, msgID int) (*model.Message, error) {
	query := `SELECT id, organization_id, application_id, device_id, to_number, body, status, direction, created_at FROM messages WHERE id = $1`
	var m model.Message
	err := s.db.QueryRow(ctx, query, msgID).Scan(&m.ID, &m.OrganizationID, &m.ApplicationID, &m.DeviceID, &m.ToNumber, &m.Body, &m.Status, &m.Direction, &m.CreatedAt)
	return &m, err
}

func (s *Store) GetDueScheduledMessages(ctx context.Context) ([]model.Message, error) {
	query := `
		SELECT id, organization_id, application_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at, scheduled_at, processed_at
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
			&m.Body,
			&m.Status,
			&m.Direction,
			&m.Priority,
			&reqTags,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.ScheduledAt,
			&m.ProcessedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan due message: %w", err)
		}
		m.RequiredTags = reqTags
		messages = append(messages, m)
	}
	return messages, nil
}
