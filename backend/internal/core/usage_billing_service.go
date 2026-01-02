package core

import (
	"context"
	"fmt"
	"time"

	"github.com/zenderock/simly-backend/internal/store"
)

// UsageBillingService handles billing calculations and invoice generation using usage tracking
type UsageBillingService struct {
	store        *store.Store
	usageService *UsageService
}

func NewUsageBillingService(store *store.Store, usageService *UsageService) *UsageBillingService {
	return &UsageBillingService{
		store:        store,
		usageService: usageService,
	}
}

// GenerateInvoiceData generates detailed invoice data for a billing period
func (s *UsageBillingService) GenerateInvoiceData(ctx context.Context, orgID int, period string) (*InvoiceData, error) {
	// Get usage summary
	summary, err := s.usageService.GetUsageSummary(ctx, orgID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage summary: %w", err)
	}

	// Get detailed breakdown
	breakdown, err := s.usageService.GetDetailedUsageBreakdown(ctx, orgID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get detailed breakdown: %w", err)
	}

	// Get organization info
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	invoice := &InvoiceData{
		OrganizationID:   orgID,
		OrganizationName: org.Name,
		Period:           period,
		Summary:          summary,
		Breakdown:        breakdown,
		GeneratedAt:      time.Now(),
	}

	return invoice, nil
}

// GetCurrentPeriodUsage gets usage for the current billing period
func (s *UsageBillingService) GetCurrentPeriodUsage(ctx context.Context, orgID int) (*UsageSummary, error) {
	currentPeriod := time.Now().Format("2006-01")
	return s.usageService.GetUsageSummary(ctx, orgID, currentPeriod)
}

// GetUsageHistory gets usage history for multiple periods
func (s *UsageBillingService) GetUsageHistory(ctx context.Context, orgID int, months int) ([]UsageSummary, error) {
	var summaries []UsageSummary

	for i := 0; i < months; i++ {
		date := time.Now().AddDate(0, -i, 0)
		period := date.Format("2006-01")

		summary, err := s.usageService.GetUsageSummary(ctx, orgID, period)
		if err != nil {
			return nil, fmt.Errorf("failed to get usage for period %s: %w", period, err)
		}

		summaries = append(summaries, *summary)
	}

	return summaries, nil
}

// CalculateProRatedUsage calculates usage for a partial billing period
func (s *UsageBillingService) CalculateProRatedUsage(ctx context.Context, orgID int, startDate, endDate time.Time) (*ProRatedUsage, error) {
	records, err := s.store.GetUsageRecordsByDateRange(ctx, orgID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage records: %w", err)
	}

	usage := &ProRatedUsage{
		OrganizationID: orgID,
		StartDate:      startDate,
		EndDate:        endDate,
		TotalCost:      0,
		SMSCount:       0,
		SMSCost:        0,
		FeatureUsage:   make(map[string]int),
		GeneratedAt:    time.Now(),
	}

	for _, record := range records {
		usage.TotalCost += record.Cost

		switch record.UsageType {
		case "sms":
			usage.SMSCount++
			usage.SMSCost += record.Cost
		default:
			usage.FeatureUsage[record.UsageType]++
		}
	}

	return usage, nil
}

// InvoiceData represents complete invoice information
type InvoiceData struct {
	OrganizationID   int                     `json:"organization_id"`
	OrganizationName string                  `json:"organization_name"`
	Period           string                  `json:"period"`
	Summary          *UsageSummary           `json:"summary"`
	Breakdown        *DetailedUsageBreakdown `json:"breakdown"`
	GeneratedAt      time.Time               `json:"generated_at"`
}

// ProRatedUsage represents usage for a partial billing period
type ProRatedUsage struct {
	OrganizationID int            `json:"organization_id"`
	StartDate      time.Time      `json:"start_date"`
	EndDate        time.Time      `json:"end_date"`
	TotalCost      float64        `json:"total_cost"`
	SMSCount       int            `json:"sms_count"`
	SMSCost        float64        `json:"sms_cost"`
	FeatureUsage   map[string]int `json:"feature_usage"`
	GeneratedAt    time.Time      `json:"generated_at"`
}
