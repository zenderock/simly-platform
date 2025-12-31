package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateMessage(ctx context.Context, msg *model.Message) error {
	query := `
		INSERT INTO messages (organization_id, application_id, device_id, to_number, body, status, direction, priority, required_tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
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
	).Scan(&msg.ID, &msg.CreatedAt, &msg.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create message: %w", err)
	}
	return nil
}

func (s *Store) GetMessagesByOrganizationID(ctx context.Context, orgID int) ([]model.Message, error) {
	query := `
		SELECT 
			m.id, m.organization_id, m.application_id, m.device_id, m.to_number, m.body, m.status, m.direction, m.priority, m.required_tags, m.created_at, m.updated_at,
			a.name as application_name,
			d.name as device_name
		FROM messages m
		LEFT JOIN applications a ON m.application_id = a.id
		LEFT JOIN devices d ON m.device_id = d.id
		WHERE m.organization_id = $1
		ORDER BY m.created_at DESC
	`
	rows, err := s.db.Query(ctx, query, orgID)
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
