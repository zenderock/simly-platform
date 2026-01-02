# Design Document - Pay-Per-Use Pricing System

## Overview

This design transforms the current subscription-based SMS pricing model to a pay-per-use system where customers pay only for SMS messages sent, while maintaining plan-based limits on organizational features (applications, contacts, campaigns) and technical constraints for system stability.

## Architecture

The new pricing system maintains the existing service architecture but modifies the rate limiting and billing components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SMS Service   │────│  Rate Limiter   │────│ Usage Tracker   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Pricing Engine  │    │ Feature Limits  │    │ Billing System  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components and Interfaces

### Modified Rate Limiter Service
- **Purpose**: Enforce technical burst limits and feature constraints without SMS monthly quotas
- **Key Changes**: Remove monthly SMS quota checks, maintain burst rate limiting
- **Interface**: `AllowRequest(ctx, appID, orgID, requestType)` where requestType can be SMS, Application, Contact, Campaign

### Enhanced Pricing Engine
- **Purpose**: Calculate per-SMS costs and manage plan-based feature limits
- **Key Functions**:
  - `CalculateSMSCost(plan, volume)`: Calculate cost per SMS based on plan and volume
  - `CheckFeatureLimit(orgID, featureType, currentCount)`: Validate feature limits
  - `GetPlanLimits(planID)`: Return feature limits for a plan

### Feature Limit Manager
- **Purpose**: Enforce plan-based limits on organizational features
- **Managed Limits**:
  - Maximum Applications per Organization
  - Maximum Contacts per Organization  
  - Maximum Campaigns per Organization
  - Maximum recipients per Campaign

## Data Models

### Updated Organization Model
```go
type Organization struct {
    ID                     int        `json:"id"`
    Name                   string     `json:"name"`
    Slug                   string     `json:"slug"`
    Plan                   string     `json:"plan"`
    // REMOVED: SMSMonthlyLimit
    SMSBurstLimit          int        `json:"sms_burst_limit"`
    MaxDevices             int        `json:"max_devices"`
    MaxSimsPerDevice       int        `json:"max_sims_per_device"`
    // NEW FEATURE LIMITS
    MaxApplications        int        `json:"max_applications"`
    MaxContacts           int        `json:"max_contacts"`
    MaxCampaigns          int        `json:"max_campaigns"`
    MaxRecipientsPerCampaign int     `json:"max_recipients_per_campaign"`
    // Billing fields
    StripeCustomerID       *string    `json:"stripe_customer_id,omitempty"`
    StripeSubscriptionID   *string    `json:"stripe_subscription_id,omitempty"`
    StripePriceID          *string    `json:"stripe_price_id,omitempty"`
    StripeCurrentPeriodEnd *time.Time `json:"stripe_current_period_end,omitempty"`
    // Dispatch settings
    SMSThrottleRateSeconds int       `json:"sms_throttle_rate_seconds"`
    SendWindowStart        int       `json:"send_window_start"`
    SendWindowEnd          int       `json:"send_window_end"`
    SendWindowTimezone     string    `json:"send_window_timezone"`
    CreatedAt              time.Time `json:"created_at"`
    UpdatedAt              time.Time `json:"updated_at"`
}
```

### Updated Plan Model
```go
type PlanLimits struct {
    SMSRatePerMessage      float64 `json:"sms_rate_per_message"` // Cost in cents
    SMSBurst              int     `json:"sms_burst"`
    MaxDevices            int     `json:"max_devices"` // -1 = unlimited
    MaxSimsPerDevice      int     `json:"max_sims_per_device"`
    MaxApplications       int     `json:"max_applications"` // -1 = unlimited
    MaxContacts          int     `json:"max_contacts"` // -1 = unlimited
    MaxCampaigns         int     `json:"max_campaigns"` // -1 = unlimited
    MaxRecipientsPerCampaign int `json:"max_recipients_per_campaign"` // -1 = unlimited
}
```

### Usage Tracking Model
```go
type UsageRecord struct {
    ID             int       `json:"id"`
    OrganizationID int       `json:"organization_id"`
    ApplicationID  int       `json:"application_id"`
    MessageID      *int      `json:"message_id,omitempty"`
    UsageType      string    `json:"usage_type"` // "sms", "application", "contact", "campaign"
    Cost           float64   `json:"cost"` // Cost in cents
    Timestamp      time.Time `json:"timestamp"`
    Period         string    `json:"period"` // YYYY-MM for billing aggregation
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
### Property Reflection

After reviewing all properties identified in the prework, several can be consolidated:

**Redundancy Analysis:**
- Properties 2.5 and 3.1 (Application limits) are identical - consolidate into one
- Properties 1.2 and 6.1 (per-SMS rates) overlap - combine into comprehensive pricing property
- Properties 1.4 and 4.2 (billing calculations) can be merged into billing accuracy property
- Properties 2.1 and 2.2 (burst limiting) can be combined into comprehensive burst limit property

**Final Correctness Properties:**

Property 1: SMS processing without monthly quotas
*For any* Organization and SMS request, the SMS service should process the request without checking monthly SMS quotas, only applying burst limits and feature constraints
**Validates: Requirements 1.1, 1.3**

Property 2: Per-SMS cost calculation accuracy
*For any* Organization plan and SMS volume, the pricing engine should calculate costs using the correct per-SMS rate for that plan tier, including volume discounts where applicable
**Validates: Requirements 1.2, 6.1, 6.4**

Property 3: Burst rate limiting behavior
*For any* Organization, when SMS requests exceed burst limits, the system should temporarily throttle requests but allow them to resume when the burst window resets
**Validates: Requirements 2.1, 2.2**

Property 4: Feature limit enforcement
*For any* Organization and feature type (Applications, Contacts, Campaigns, recipients per Campaign), the system should enforce the maximum count based on the Organization's plan tier
**Validates: Requirements 2.5, 3.1, 3.2, 3.3, 3.4**

Property 5: Unlimited SMS within feature constraints
*For any* Organization at their feature limits, the SMS service should continue allowing unlimited SMS sending without restriction
**Validates: Requirements 3.5**

Property 6: Usage tracking accuracy
*For any* successfully sent SMS, the usage tracker should create a record with correct timestamp, cost, and organization information
**Validates: Requirements 4.1**

Property 7: Billing calculation accuracy
*For any* billing period and organization usage, the pricing engine should calculate total charges that equal the sum of individual SMS costs for that period
**Validates: Requirements 1.4, 4.2, 4.4**

Property 8: Plan upgrade rate application
*For any* Organization plan upgrade, subsequent SMS usage should immediately use the new plan's per-SMS rate
**Validates: Requirements 6.2**

Property 9: Plan-based limit updates
*For any* Organization plan change, the system should immediately update feature limits (Applications, Contacts, Campaigns, devices) to match the new plan tier
**Validates: Requirements 6.3, 6.5**

## Error Handling

### SMS Processing Errors
- **Burst Limit Exceeded**: Return HTTP 429 with retry-after header
- **Feature Limit Exceeded**: Return HTTP 403 with clear error message indicating which limit was reached
- **Invalid Plan Configuration**: Log error and fall back to free plan limits

### Billing Errors
- **Cost Calculation Failure**: Log error, use fallback rate, alert administrators
- **Usage Tracking Failure**: Retry with exponential backoff, ensure SMS still processes
- **Invoice Generation Failure**: Queue for retry, notify billing team

### Migration Errors
- **Data Integrity Issues**: Halt migration, rollback changes, alert administrators
- **Legacy Configuration Conflicts**: Log warnings, apply safe defaults

## Testing Strategy

### Unit Testing Approach
Unit tests will focus on:
- Individual component behavior (pricing calculations, limit checks)
- Error handling scenarios
- Edge cases like plan transitions and migration scenarios
- Integration between rate limiter and feature limit manager

### Property-Based Testing Approach
Property-based tests will use **QuickCheck for Go** (github.com/leanovate/gopter) and run a minimum of 100 iterations per property. Each test will be tagged with the format: **Feature: pay-per-use-pricing, Property {number}: {property_text}**

Property tests will verify:
- SMS processing works across all valid organization and request combinations
- Cost calculations are accurate for all plan and volume combinations  
- Rate limiting behaves correctly under various load patterns
- Feature limits are enforced consistently across all feature types
- Usage tracking captures all successful SMS sends accurately
- Billing calculations remain consistent across different usage patterns
- Plan changes immediately affect rates and limits as expected

**Test Data Generation Strategy:**
- Generate random Organizations with various plan types and current usage levels
- Create diverse SMS request patterns (single messages, bursts, sustained load)
- Generate realistic billing periods with varied usage distributions
- Create plan transition scenarios (upgrades, downgrades, feature changes)

Both unit and property tests are complementary: unit tests catch specific bugs and edge cases, while property tests verify general correctness across the entire input space.