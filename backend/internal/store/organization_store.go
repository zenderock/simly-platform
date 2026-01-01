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
		SELECT id, name, slug, plan, sms_monthly_limit, sms_burst_limit, max_devices, max_sims_per_device, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_current_period_end, created_at, updated_at
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
		&org.StripeCustomerID,
		&org.StripeSubscriptionID,
		&org.StripePriceID,
		&org.StripeCurrentPeriodEnd,
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
		SELECT o.id, o.name, o.slug, o.plan, o.sms_monthly_limit, o.sms_burst_limit, o.max_devices, o.max_sims_per_device, o.created_at, o.updated_at
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
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.SMSMonthlyLimit, &o.SMSBurstLimit, &o.MaxDevices, &o.MaxSimsPerDevice, &o.CreatedAt, &o.UpdatedAt); err != nil {
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

func (s *Store) UpdateOrganization(ctx context.Context, orgID int, name string) error {
	query := `UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2`
	result, err := s.db.Exec(ctx, query, name, orgID)
	if err != nil {
		return fmt.Errorf("failed to update organization: %w", err)
	}
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("organization not found")
	}
	return nil
}

func (s *Store) UpdateOrganizationPlan(ctx context.Context, orgID int, plan string, smsMonthly, smsBurst, maxDevices, maxSimsPerDevice int) error {
	query := `
		UPDATE organizations 
		SET plan = $1, sms_monthly_limit = $2, sms_burst_limit = $3, max_devices = $4, max_sims_per_device = $5, updated_at = NOW() 
		WHERE id = $6
	`
	result, err := s.db.Exec(ctx, query, plan, smsMonthly, smsBurst, maxDevices, maxSimsPerDevice, orgID)
	if err != nil {
		return fmt.Errorf("failed to update organization plan: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("organization not found")
	}
	return nil
}

func (s *Store) GetOrganizationStats(ctx context.Context, orgID int) (*model.OrganizationStats, error) {
	stats := &model.OrganizationStats{}

	// Messages today
	query := `
		SELECT COUNT(*) 
		FROM messages 
		WHERE organization_id = $1 AND DATE(created_at) = CURRENT_DATE
	`
	err := s.db.QueryRow(ctx, query, orgID).Scan(&stats.MessagesToday)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages today: %w", err)
	}

	// Messages this month
	query = `
		SELECT COUNT(*) 
		FROM messages 
		WHERE organization_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
	`
	err = s.db.QueryRow(ctx, query, orgID).Scan(&stats.MessagesThisMonth)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages this month: %w", err)
	}

	// Active devices (seen in last 24 hours)
	query = `
		SELECT COUNT(*) 
		FROM devices 
		WHERE organization_id = $1 AND status = 'online' AND last_seen_at > NOW() - INTERVAL '24 hours'
	`
	err = s.db.QueryRow(ctx, query, orgID).Scan(&stats.ActiveDevices)
	if err != nil {
		return nil, fmt.Errorf("failed to get active devices: %w", err)
	}

	// Total devices
	query = `
		SELECT COUNT(*) 
		FROM devices 
		WHERE organization_id = $1
	`
	err = s.db.QueryRow(ctx, query, orgID).Scan(&stats.TotalDevices)
	if err != nil {
		return nil, fmt.Errorf("failed to get total devices: %w", err)
	}

	// Success rate (last 30 days)
	query = `
		SELECT 
			CASE 
				WHEN COUNT(*) = 0 THEN 0.0
				ELSE ROUND(
					(COUNT(*) FILTER (WHERE status = 'delivered')::float / COUNT(*)::float) * 100, 
					1
				)
			END as success_rate
		FROM messages 
		WHERE organization_id = $1 AND created_at > NOW() - INTERVAL '30 days'
	`
	err = s.db.QueryRow(ctx, query, orgID).Scan(&stats.SuccessRate)
	if err != nil {
		return nil, fmt.Errorf("failed to get success rate: %w", err)
	}

	return stats, nil
}

func (s *Store) UpdateOrganizationStripe(ctx context.Context, orgID int, customerID, subscriptionID string) error {
	query := `UPDATE organizations SET stripe_customer_id = $1, stripe_subscription_id = $2, updated_at = NOW() WHERE id = $3`
	_, err := s.db.Exec(ctx, query, customerID, subscriptionID, orgID)
	return err
}

func (s *Store) GetOrganizationByStripeCustomerID(ctx context.Context, customerID string) (*model.Organization, error) {
	query := `SELECT id, name, plan FROM organizations WHERE stripe_customer_id = $1`
	var org model.Organization
	err := s.db.QueryRow(ctx, query, customerID).Scan(&org.ID, &org.Name, &org.Plan)
	if err != nil {
		return nil, err
	}
	return &org, nil
}
