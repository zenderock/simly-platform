package store

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
)

func (s *Store) CreateOrganization(ctx context.Context, org *model.Organization) error {
	query := `
		INSERT INTO organizations (
			name, slug, plan, 
			sms_monthly_limit, sms_burst_limit, max_devices, max_sims_per_device,
			max_applications, max_contacts, max_campaigns, max_recipients_per_campaign,
			sms_throttle_rate_seconds, send_window_start, send_window_end, send_window_timezone,
			created_at, updated_at
		)
		VALUES (
			$1, $2, $3, 
			$4, $5, $6, $7, 
			$8, $9, $10, $11, 
			$12, $13, $14, $15,
			NOW(), NOW()
		)
		RETURNING id, created_at, updated_at
	`
	err := s.db.QueryRow(ctx, query,
		org.Name, org.Slug, org.Plan,
		org.SMSMonthlyLimit, org.SMSBurstLimit, org.MaxDevices, org.MaxSimsPerDevice,
		org.MaxApplications, org.MaxContacts, org.MaxCampaigns, org.MaxRecipientsPerCampaign,
		org.SMSThrottleRateSeconds, org.SendWindowStart, org.SendWindowEnd, org.SendWindowTimezone,
	).Scan(&org.ID, &org.CreatedAt, &org.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create organization: %w", err)
	}
	return nil
}

func (s *Store) GetOrganizationByID(ctx context.Context, id int) (*model.Organization, error) {
	query := `
		SELECT id, name, slug, plan, sms_monthly_limit, sms_burst_limit, max_devices, max_sims_per_device, 
		       max_applications, max_contacts, max_campaigns, max_recipients_per_campaign,
		       stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_current_period_end, 
		       sms_throttle_rate_seconds, send_window_start, send_window_end, send_window_timezone, 
		       created_at, updated_at
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
		&org.MaxApplications,
		&org.MaxContacts,
		&org.MaxCampaigns,
		&org.MaxRecipientsPerCampaign,
		&org.StripeCustomerID,
		&org.StripeSubscriptionID,
		&org.StripePriceID,
		&org.StripeCurrentPeriodEnd,
		&org.SMSThrottleRateSeconds,
		&org.SendWindowStart,
		&org.SendWindowEnd,
		&org.SendWindowTimezone,
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
		SELECT o.id, o.name, o.slug, o.plan, o.sms_monthly_limit, o.sms_burst_limit, o.max_devices, o.max_sims_per_device,
		       o.max_applications, o.max_contacts, o.max_campaigns, o.max_recipients_per_campaign,
		       o.sms_throttle_rate_seconds, o.send_window_start, o.send_window_end, o.send_window_timezone, 
		       o.created_at, o.updated_at
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
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.SMSMonthlyLimit, &o.SMSBurstLimit, &o.MaxDevices, &o.MaxSimsPerDevice, &o.MaxApplications, &o.MaxContacts, &o.MaxCampaigns, &o.MaxRecipientsPerCampaign, &o.SMSThrottleRateSeconds, &o.SendWindowStart, &o.SendWindowEnd, &o.SendWindowTimezone, &o.CreatedAt, &o.UpdatedAt); err != nil {
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

func (s *Store) UpdateOrganizationPlan(ctx context.Context, orgID int, plan string, smsMonthly, smsBurst, maxDevices, maxSimsPerDevice, maxApplications, maxContacts, maxCampaigns, maxRecipientsPerCampaign int) error {
	query := `
		UPDATE organizations 
		SET plan = $1, sms_monthly_limit = $2, sms_burst_limit = $3, max_devices = $4, max_sims_per_device = $5,
		    max_applications = $6, max_contacts = $7, max_campaigns = $8, max_recipients_per_campaign = $9,
		    updated_at = NOW() 
		WHERE id = $10
	`
	result, err := s.db.Exec(ctx, query, plan, smsMonthly, smsBurst, maxDevices, maxSimsPerDevice, maxApplications, maxContacts, maxCampaigns, maxRecipientsPerCampaign, orgID)
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

	// Current Month Cost
	currentPeriod := time.Now().Format("2006-01")
	cost, err := s.GetUsageSummaryByPeriod(ctx, orgID, currentPeriod)
	if err != nil {
		// Log error but don't fail stats entirely? Or return 0?
		// Ensure GetUsageSummaryByPeriod handles no rows gracefully (it returns 0)
		stats.CurrentMonthCost = 0.0
	} else {
		stats.CurrentMonthCost = cost
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

// OrganizationDispatchSettings holds dispatch-related settings for an organization
type OrganizationDispatchSettings struct {
	SMSThrottleRateSeconds int    `json:"sms_throttle_rate_seconds"`
	SendWindowStart        int    `json:"send_window_start"`
	SendWindowEnd          int    `json:"send_window_end"`
	SendWindowTimezone     string `json:"send_window_timezone"`
}

// GetOrganizationDispatchSettings retrieves dispatch settings for an organization
func (s *Store) GetOrganizationDispatchSettings(ctx context.Context, orgID int) (*OrganizationDispatchSettings, error) {
	query := `
		SELECT sms_throttle_rate_seconds, send_window_start, send_window_end, send_window_timezone
		FROM organizations
		WHERE id = $1
	`
	var settings OrganizationDispatchSettings
	err := s.db.QueryRow(ctx, query, orgID).Scan(
		&settings.SMSThrottleRateSeconds,
		&settings.SendWindowStart,
		&settings.SendWindowEnd,
		&settings.SendWindowTimezone,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization dispatch settings: %w", err)
	}
	return &settings, nil
}

// UpdateOrganizationDispatchSettings updates dispatch settings for an organization
func (s *Store) UpdateOrganizationDispatchSettings(ctx context.Context, orgID int, settings *OrganizationDispatchSettings) error {
	query := `
		UPDATE organizations 
		SET sms_throttle_rate_seconds = $1, 
		    send_window_start = $2, 
		    send_window_end = $3, 
		    send_window_timezone = $4, 
		    updated_at = NOW() 
		WHERE id = $5
	`
	result, err := s.db.Exec(ctx, query,
		settings.SMSThrottleRateSeconds,
		settings.SendWindowStart,
		settings.SendWindowEnd,
		settings.SendWindowTimezone,
		orgID,
	)
	if err != nil {
		return fmt.Errorf("failed to update organization dispatch settings: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("organization not found")
	}
	return nil
}

// CreateUsageRecord creates a new usage record for billing purposes
func (s *Store) CreateUsageRecord(ctx context.Context, record *model.UsageRecord) error {
	query := `
		INSERT INTO usage_records (organization_id, application_id, message_id, usage_type, cost, timestamp, period, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(ctx, query,
		record.OrganizationID,
		record.ApplicationID,
		record.MessageID,
		record.UsageType,
		record.Cost,
		record.Timestamp,
		record.Period,
	).Scan(&record.ID, &record.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create usage record: %w", err)
	}
	return nil
}

// GetUsageRecordsByPeriod retrieves usage records for an organization within a specific billing period
func (s *Store) GetUsageRecordsByPeriod(ctx context.Context, orgID int, period string) ([]model.UsageRecord, error) {
	query := `
		SELECT id, organization_id, application_id, message_id, usage_type, cost, timestamp, period, created_at
		FROM usage_records
		WHERE organization_id = $1 AND period = $2
		ORDER BY timestamp DESC
	`
	rows, err := s.db.Query(ctx, query, orgID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage records: %w", err)
	}
	defer rows.Close()

	var records []model.UsageRecord
	for rows.Next() {
		var record model.UsageRecord
		err := rows.Scan(
			&record.ID,
			&record.OrganizationID,
			&record.ApplicationID,
			&record.MessageID,
			&record.UsageType,
			&record.Cost,
			&record.Timestamp,
			&record.Period,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan usage record: %w", err)
		}
		records = append(records, record)
	}
	return records, nil
}

// GetUsageSummaryByPeriod calculates total usage cost for an organization in a billing period
func (s *Store) GetUsageSummaryByPeriod(ctx context.Context, orgID int, period string) (float64, error) {
	query := `
		SELECT COALESCE(SUM(cost), 0) as total_cost
		FROM usage_records
		WHERE organization_id = $1 AND period = $2
	`
	var totalCost float64
	err := s.db.QueryRow(ctx, query, orgID, period).Scan(&totalCost)
	if err != nil {
		return 0, fmt.Errorf("failed to get usage summary: %w", err)
	}
	return totalCost, nil
}

// GetUsageRecordsByTypeAndPeriod retrieves usage records filtered by type for a specific period
func (s *Store) GetUsageRecordsByTypeAndPeriod(ctx context.Context, orgID int, period string, usageType string) ([]model.UsageRecord, error) {
	query := `
		SELECT id, organization_id, application_id, message_id, usage_type, cost, timestamp, period, created_at
		FROM usage_records
		WHERE organization_id = $1 AND period = $2 AND usage_type = $3
		ORDER BY timestamp DESC
	`
	rows, err := s.db.Query(ctx, query, orgID, period, usageType)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage records by type: %w", err)
	}
	defer rows.Close()

	var records []model.UsageRecord
	for rows.Next() {
		var record model.UsageRecord
		err := rows.Scan(
			&record.ID,
			&record.OrganizationID,
			&record.ApplicationID,
			&record.MessageID,
			&record.UsageType,
			&record.Cost,
			&record.Timestamp,
			&record.Period,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan usage record: %w", err)
		}
		records = append(records, record)
	}
	return records, nil
}

// GetUsageRecordsByDateRange retrieves usage records within a date range for detailed billing
func (s *Store) GetUsageRecordsByDateRange(ctx context.Context, orgID int, startDate, endDate time.Time) ([]model.UsageRecord, error) {
	query := `
		SELECT id, organization_id, application_id, message_id, usage_type, cost, timestamp, period, created_at
		FROM usage_records
		WHERE organization_id = $1 AND timestamp >= $2 AND timestamp <= $3
		ORDER BY timestamp DESC
	`
	rows, err := s.db.Query(ctx, query, orgID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage records by date range: %w", err)
	}
	defer rows.Close()

	var records []model.UsageRecord
	for rows.Next() {
		var record model.UsageRecord
		err := rows.Scan(
			&record.ID,
			&record.OrganizationID,
			&record.ApplicationID,
			&record.MessageID,
			&record.UsageType,
			&record.Cost,
			&record.Timestamp,
			&record.Period,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan usage record: %w", err)
		}
		records = append(records, record)
	}
	return records, nil
}
