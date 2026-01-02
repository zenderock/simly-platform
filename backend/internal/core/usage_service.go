package core

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// UsageService handles tracking of various usage types for billing purposes
type UsageService struct {
	store         *store.Store
	pricingEngine *PricingEngine
}

func NewUsageService(store *store.Store, pricingEngine *PricingEngine) *UsageService {
	return &UsageService{
		store:         store,
		pricingEngine: pricingEngine,
	}
}

// RecordSMSUsage records SMS usage with accurate cost calculation
func (s *UsageService) RecordSMSUsage(ctx context.Context, orgID int, appID *int, messageID *int, cost float64) error {
	period := time.Now().Format("2006-01") // YYYY-MM format

	record := &model.UsageRecord{
		OrganizationID: orgID,
		ApplicationID:  appID,
		MessageID:      messageID,
		UsageType:      "sms",
		Cost:           cost,
		Timestamp:      time.Now(),
		Period:         period,
	}

	return s.store.CreateUsageRecord(ctx, record)
}

// RecordApplicationUsage records application creation usage
func (s *UsageService) RecordApplicationUsage(ctx context.Context, orgID int, appID int) error {
	period := time.Now().Format("2006-01")

	record := &model.UsageRecord{
		OrganizationID: orgID,
		ApplicationID:  &appID,
		MessageID:      nil,
		UsageType:      "application",
		Cost:           0, // Application creation is typically free, just tracked for limits
		Timestamp:      time.Now(),
		Period:         period,
	}

	return s.store.CreateUsageRecord(ctx, record)
}

// RecordContactUsage records contact creation/storage usage
func (s *UsageService) RecordContactUsage(ctx context.Context, orgID int, contactID int) error {
	period := time.Now().Format("2006-01")

	record := &model.UsageRecord{
		OrganizationID: orgID,
		ApplicationID:  nil,
		MessageID:      nil,
		UsageType:      "contact",
		Cost:           0, // Contact storage is typically free, just tracked for limits
		Timestamp:      time.Now(),
		Period:         period,
	}

	return s.store.CreateUsageRecord(ctx, record)
}

// RecordCampaignUsage records campaign creation usage
func (s *UsageService) RecordCampaignUsage(ctx context.Context, orgID int, campaignID int) error {
	period := time.Now().Format("2006-01")

	record := &model.UsageRecord{
		OrganizationID: orgID,
		ApplicationID:  nil,
		MessageID:      nil,
		UsageType:      "campaign",
		Cost:           0, // Campaign creation is typically free, just tracked for limits
		Timestamp:      time.Now(),
		Period:         period,
	}

	return s.store.CreateUsageRecord(ctx, record)
}

// GetUsageByType retrieves usage records filtered by type for a specific period
func (s *UsageService) GetUsageByType(ctx context.Context, orgID int, period string, usageType string) ([]model.UsageRecord, error) {
	return s.store.GetUsageRecordsByTypeAndPeriod(ctx, orgID, period, usageType)
}

// GetUsageSummary provides aggregated usage data for billing purposes
func (s *UsageService) GetUsageSummary(ctx context.Context, orgID int, period string) (*UsageSummary, error) {
	// Get total cost
	totalCost, err := s.store.GetUsageSummaryByPeriod(ctx, orgID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get total cost: %w", err)
	}

	// Get SMS count and cost
	smsRecords, err := s.store.GetUsageRecordsByTypeAndPeriod(ctx, orgID, period, "sms")
	if err != nil {
		return nil, fmt.Errorf("failed to get SMS records: %w", err)
	}

	smsCount := len(smsRecords)
	smsCost := 0.0
	for _, record := range smsRecords {
		smsCost += record.Cost
	}

	// Get feature usage counts
	appRecords, err := s.store.GetUsageRecordsByTypeAndPeriod(ctx, orgID, period, "application")
	if err != nil {
		return nil, fmt.Errorf("failed to get application records: %w", err)
	}

	contactRecords, err := s.store.GetUsageRecordsByTypeAndPeriod(ctx, orgID, period, "contact")
	if err != nil {
		return nil, fmt.Errorf("failed to get contact records: %w", err)
	}

	campaignRecords, err := s.store.GetUsageRecordsByTypeAndPeriod(ctx, orgID, period, "campaign")
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign records: %w", err)
	}

	return &UsageSummary{
		OrganizationID:   orgID,
		Period:           period,
		TotalCost:        totalCost,
		SMSCount:         smsCount,
		SMSCost:          smsCost,
		ApplicationsUsed: len(appRecords),
		ContactsUsed:     len(contactRecords),
		CampaignsUsed:    len(campaignRecords),
		GeneratedAt:      time.Now(),
	}, nil
}

// GetDetailedUsageBreakdown provides detailed breakdown for billing transparency
func (s *UsageService) GetDetailedUsageBreakdown(ctx context.Context, orgID int, period string) (*DetailedUsageBreakdown, error) {
	allRecords, err := s.store.GetUsageRecordsByPeriod(ctx, orgID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage records: %w", err)
	}

	breakdown := &DetailedUsageBreakdown{
		OrganizationID: orgID,
		Period:         period,
		SMSBreakdown:   make([]SMSUsageDetail, 0),
		FeatureUsage:   make(map[string]int),
		TotalCost:      0,
		GeneratedAt:    time.Now(),
	}

	for _, record := range allRecords {
		breakdown.TotalCost += record.Cost

		switch record.UsageType {
		case "sms":
			detail := SMSUsageDetail{
				MessageID:     record.MessageID,
				ApplicationID: record.ApplicationID,
				Cost:          record.Cost,
				Timestamp:     record.Timestamp,
			}
			breakdown.SMSBreakdown = append(breakdown.SMSBreakdown, detail)
		default:
			breakdown.FeatureUsage[record.UsageType]++
		}
	}

	return breakdown, nil
}

// UsageSummary provides aggregated usage information for billing
type UsageSummary struct {
	OrganizationID   int       `json:"organization_id"`
	Period           string    `json:"period"`
	TotalCost        float64   `json:"total_cost"`
	SMSCount         int       `json:"sms_count"`
	SMSCost          float64   `json:"sms_cost"`
	ApplicationsUsed int       `json:"applications_used"`
	ContactsUsed     int       `json:"contacts_used"`
	CampaignsUsed    int       `json:"campaigns_used"`
	GeneratedAt      time.Time `json:"generated_at"`
}

// DetailedUsageBreakdown provides detailed usage information for transparency
type DetailedUsageBreakdown struct {
	OrganizationID int              `json:"organization_id"`
	Period         string           `json:"period"`
	SMSBreakdown   []SMSUsageDetail `json:"sms_breakdown"`
	FeatureUsage   map[string]int   `json:"feature_usage"`
	TotalCost      float64          `json:"total_cost"`
	GeneratedAt    time.Time        `json:"generated_at"`
}

// SMSUsageDetail provides per-SMS cost information
type SMSUsageDetail struct {
	MessageID     *int      `json:"message_id,omitempty"`
	ApplicationID *int      `json:"application_id,omitempty"`
	Cost          float64   `json:"cost"`
	Timestamp     time.Time `json:"timestamp"`
}
