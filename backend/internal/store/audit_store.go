package store

import (
	"context"
	"fmt"
)

type AuditLog struct {
	ID             int    `json:"id"`
	OrganizationID int    `json:"organization_id"`
	ActorUserID    *int   `json:"actor_user_id"`
	Action         string `json:"action"`
	TargetResource string `json:"target_resource"`
	TargetID       string `json:"target_id"`
	Details        any    `json:"details"` // JSONB
	IPAddress      string `json:"ip_address"`
	CreatedAt      string `json:"created_at"`
}

func (s *Store) CreateAuditLog(ctx context.Context, log *AuditLog) error {
	query := `
		INSERT INTO audit_logs (organization_id, actor_user_id, action, target_resource, target_id, details, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := s.db.Exec(ctx, query,
		log.OrganizationID,
		log.ActorUserID,
		log.Action,
		log.TargetResource,
		log.TargetID,
		log.Details,
		log.IPAddress,
	)
	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}
	return nil
}

func (s *Store) GetAuditLogs(ctx context.Context, orgID int) ([]AuditLog, error) {
	// Simple list for now
	// TODO: Pagination
	return nil, nil
}
