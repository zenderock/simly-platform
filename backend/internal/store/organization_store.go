package store

import (
	"context"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateOrganization(ctx context.Context, org *model.Organization) error {
	query := `
		INSERT INTO organizations (name, slug, plan, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query, org.Name, org.Slug, org.Plan).Scan(&org.ID, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create organization: %w", err)
	}
	return nil
}

func (s *Store) GetOrganizationByID(ctx context.Context, id int) (*model.Organization, error) {
	query := `
		SELECT id, name, slug, plan, sms_monthly_limit, sms_burst_limit, max_devices, max_sims_per_device, created_at, updated_at
		FROM organizations
		WHERE id = $1
	`
	var org model.Organization
	err := s.db.QueryRow(ctx, query, id).Scan(
		&org.ID,
		&org.Name,
		&org.Slug,
		&org.Plan,
		&org.SMSMonthlyLimit,
		&org.SMSBurstLimit,
		&org.MaxDevices,
		&org.MaxSimsPerDevice,
		&org.CreatedAt,
		&org.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}
	return &org, nil
}

func (s *Store) AddOrganizationMember(ctx context.Context, member *model.OrganizationMember) error {
	query := `
		INSERT INTO organization_members (organization_id, user_id, role, joined_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, joined_at
	`
	err := s.db.QueryRow(ctx, query, member.OrganizationID, member.UserID, member.Role).Scan(&member.ID, &member.JoinedAt)
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}
	return nil
}

func (s *Store) GetUserOrganizations(ctx context.Context, userID int) ([]model.Organization, error) {
	query := `
		SELECT o.id, o.name, o.slug, o.plan, o.max_devices, o.max_sims_per_device, o.created_at, o.updated_at
		FROM organizations o
		JOIN organization_members om ON o.id = om.organization_id
		WHERE om.user_id = $1
	`
	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []model.Organization
	for rows.Next() {
		var o model.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.MaxDevices, &o.MaxSimsPerDevice, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (s *Store) GetMemberRole(ctx context.Context, orgID, userID int) (string, error) {
	query := `SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2`
	var role string
	err := s.db.QueryRow(ctx, query, orgID, userID).Scan(&role)
	if err != nil {
		return "", fmt.Errorf("failed to get member role: %w", err)
	}
	return role, nil
}

func (s *Store) RemoveOrganizationMember(ctx context.Context, orgID, userID int) error {
	query := `DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2`
	result, err := s.db.Exec(ctx, query, orgID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("member not found")
	}
	return nil
}
