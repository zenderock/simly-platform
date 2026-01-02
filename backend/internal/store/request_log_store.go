package store

import (
	"context"
	"fmt"
	"strings"

	"github.com/zenderock/simly-backend/internal/model"
)

// CreateRequestLog inserts a new request log entry
func (s *Store) CreateRequestLog(ctx context.Context, log *model.RequestLog) error {
	query := `
		INSERT INTO request_logs (organization_id, application_id, api_key_id, method, path, status_code, duration_ms, request_body, response_body, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query,
		log.OrganizationID,
		log.ApplicationID,
		log.APIKeyID,
		log.Method,
		log.Path,
		log.StatusCode,
		log.Duration,
		log.RequestBody,
		log.ResponseBody,
		log.IPAddress,
		log.UserAgent,
	).Scan(&log.ID, &log.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create request log: %w", err)
	}
	return nil
}

// GetRequestLogsByOrganizationID retrieves request logs for an organization with optional filters
func (s *Store) GetRequestLogsByOrganizationID(ctx context.Context, orgID int, filters model.RequestLogFilters) ([]model.RequestLog, error) {
	var queryBuilder strings.Builder
	queryBuilder.WriteString(`
		SELECT id, organization_id, application_id, api_key_id, method, path, status_code, duration_ms, request_body, response_body, ip_address, user_agent, created_at
		FROM request_logs
		WHERE organization_id = $1
	`)

	args := []interface{}{orgID}
	argIndex := 2

	// Apply status_code filter
	if filters.StatusCode != nil {
		queryBuilder.WriteString(fmt.Sprintf(" AND status_code = $%d", argIndex))
		args = append(args, *filters.StatusCode)
		argIndex++
	}

	// Apply path filter (partial match)
	if filters.Path != nil && *filters.Path != "" {
		queryBuilder.WriteString(fmt.Sprintf(" AND path LIKE $%d", argIndex))
		args = append(args, "%"+*filters.Path+"%")
		argIndex++
	}

	queryBuilder.WriteString(" ORDER BY created_at DESC")

	// Apply limit (default 100)
	limit := 100
	if filters.Limit > 0 {
		limit = filters.Limit
	}
	queryBuilder.WriteString(fmt.Sprintf(" LIMIT $%d", argIndex))
	args = append(args, limit)
	argIndex++

	// Apply offset
	if filters.Offset > 0 {
		queryBuilder.WriteString(fmt.Sprintf(" OFFSET $%d", argIndex))
		args = append(args, filters.Offset)
	}

	rows, err := s.db.Query(ctx, queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query request logs: %w", err)
	}
	defer rows.Close()

	var logs []model.RequestLog
	for rows.Next() {
		var l model.RequestLog
		if err := rows.Scan(
			&l.ID,
			&l.OrganizationID,
			&l.ApplicationID,
			&l.APIKeyID,
			&l.Method,
			&l.Path,
			&l.StatusCode,
			&l.Duration,
			&l.RequestBody,
			&l.ResponseBody,
			&l.IPAddress,
			&l.UserAgent,
			&l.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan request log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// GetRequestLogByID retrieves a single request log by ID and organization
func (s *Store) GetRequestLogByID(ctx context.Context, logID, orgID int) (*model.RequestLog, error) {
	query := `
		SELECT id, organization_id, application_id, api_key_id, method, path, status_code, duration_ms, request_body, response_body, ip_address, user_agent, created_at
		FROM request_logs
		WHERE id = $1 AND organization_id = $2
	`
	var l model.RequestLog
	err := s.db.QueryRow(ctx, query, logID, orgID).Scan(
		&l.ID,
		&l.OrganizationID,
		&l.ApplicationID,
		&l.APIKeyID,
		&l.Method,
		&l.Path,
		&l.StatusCode,
		&l.Duration,
		&l.RequestBody,
		&l.ResponseBody,
		&l.IPAddress,
		&l.UserAgent,
		&l.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get request log: %w", err)
	}
	return &l, nil
}
