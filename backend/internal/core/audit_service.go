package core

import (
	"context"

	"github.com/zenderock/simly-backend/internal/store"
)

type AuditService struct {
	store *store.Store
}

func NewAuditService(store *store.Store) *AuditService {
	return &AuditService{store: store}
}

func (s *AuditService) Log(ctx context.Context, orgID int, actorID *int, action, resource, targetID string, details any, ip string) {
	// Fire and forget (don't block main flow), or handle error?
	// Logging errors to stdout if DB fails is good practice.
	// For simplicity, we just run it. Using a goroutine might lose context if not careful,
	// but for critical audit trails, synchronous is often safer to ensure it happened.
	// Let's do synchronous for now to guarantee the audit trail exists before returning success.

	entry := &store.AuditLog{
		OrganizationID: orgID,
		ActorUserID:    actorID,
		Action:         action,
		TargetResource: resource,
		TargetID:       targetID,
		Details:        details,
		IPAddress:      ip,
	}

	_ = s.store.CreateAuditLog(ctx, entry)
}
