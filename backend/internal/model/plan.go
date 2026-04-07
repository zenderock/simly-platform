package model

// Plan represents a subscription plan with its limits
type Plan struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Price         int        `json:"price"` // in cents
	Period        string     `json:"period"`
	Description   string     `json:"description"`
	Features      []string   `json:"features"`
	Limits        PlanLimits `json:"limits"`
	Popular       bool       `json:"popular"`
	StripePriceID string     `json:"stripe_price_id,omitempty"`
}

type PlanLimits struct {
	SMSRatePerMessage        float64 `json:"sms_rate_per_message"` // Cost in cents
	SMSBurst                 int     `json:"sms_burst"`
	SMSMonthly               int     `json:"sms_monthly"` // -1 = unlimited
	MaxDevices               int     `json:"max_devices"` // -1 = unlimited
	MaxSimsPerDevice         int     `json:"max_sims_per_device"`
	MaxApplications          int     `json:"max_applications"`            // -1 = unlimited
	MaxContacts              int     `json:"max_contacts"`                // -1 = unlimited
	MaxCampaigns             int     `json:"max_campaigns"`               // -1 = unlimited
	MaxRecipientsPerCampaign int     `json:"max_recipients_per_campaign"` // -1 = unlimited
}

const (
	PlanFree       = "free"         // Reverted from "starter" to "free"
	PlanPro        = "professional" // Renamed from "pro" to "professional"
	PlanAgency     = "enterprise"   // Renamed from "agency" to "enterprise"
	PlanWhiteLabel = "white_label"
)

// AvailablePlans returns all available subscription plans
var AvailablePlans = []Plan{
	{
		ID:          PlanFree,
		Name:        "Free",
		Price:       0,
		Period:      "month",
		Description: "For hobbyists and testing",
		Features: []string{
			"100 SMS / month included",
			"1 application",
			"100 contacts",
			"1 campaign",
			"100 recipients per campaign",
			"1 device connection",
			"Basic receipt webhooks",
			"Community support",
		},
		Limits: PlanLimits{
			SMSRatePerMessage:        0,
			SMSBurst:                 10,
			SMSMonthly:               100,
			MaxDevices:               1,
			MaxSimsPerDevice:         1,
			MaxApplications:          1,
			MaxContacts:              100,
			MaxCampaigns:             1,
			MaxRecipientsPerCampaign: 100,
		},
		Popular: false,
	},
	{
		ID:          PlanPro,
		Name:        "Professional",
		Price:       1000, // $10
		Period:      "month",
		Description: "For startups and small businesses",
		Features: []string{
			"Unlimited SMS",
			"5 applications",
			"1,000 contacts",
			"5 campaigns",
			"1,000 recipients per campaign",
			"Up to 2 devices",
			"1 SIM per device",
			"Priority support",
			"API access",
			"Advanced webhooks",
		},
		Limits: PlanLimits{
			SMSRatePerMessage:        0,
			SMSBurst:                 100,
			SMSMonthly:               -1, // Unlimited
			MaxDevices:               2,
			MaxSimsPerDevice:         1,
			MaxApplications:          5,
			MaxContacts:              1000,
			MaxCampaigns:             5,
			MaxRecipientsPerCampaign: 1000,
		},
		Popular: true,
	},
	{
		ID:          PlanAgency,
		Name:        "Enterprise",
		Price:       9900, // $99
		Period:      "month",
		Description: "For large campaigns and fleets",
		Features: []string{
			"Unlimited SMS",
			"Unlimited applications",
			"Unlimited contacts",
			"Unlimited campaigns",
			"Unlimited recipients per campaign",
			"Unlimited devices",
			"4 SIMs per device",
			"White-label options",
			"Dedicated support",
			"Full API access",
			"Advanced webhooks",
		},
		Limits: PlanLimits{
			SMSRatePerMessage:        0,
			SMSBurst:                 1000,
			SMSMonthly:               -1, // Unlimited
			MaxDevices:               -1, // unlimited
			MaxSimsPerDevice:         4,
			MaxApplications:          -1, // unlimited
			MaxContacts:              -1, // unlimited
			MaxCampaigns:             -1, // unlimited
			MaxRecipientsPerCampaign: -1, // unlimited
		},
		Popular: false,
	},
	{
		ID:          PlanWhiteLabel,
		Name:        "White-Label",
		Price:       12000, // $120
		Period:      "month",
		Description: "Your brand, your system",
		Features: []string{
			"Unlimited SMS",
			"Unlimited devices",
			"Unlimited apps",
			"QR scan via public API",
			"Custom branding (logo + name)",
			"Dedicated mobile app",
			"Dedicated support",
		},
		Limits: PlanLimits{
			SMSRatePerMessage:        0,
			SMSBurst:                 200,
			SMSMonthly:               -1, // unlimited
			MaxDevices:               -1, // unlimited
			MaxSimsPerDevice:         4,
			MaxApplications:          -1, // unlimited
			MaxContacts:              -1, // unlimited
			MaxCampaigns:             -1, // unlimited
			MaxRecipientsPerCampaign: -1, // unlimited
		},
		Popular: false,
	},
}

// GetPlanByID returns a plan by its ID
func GetPlanByID(id string) *Plan {
	for _, p := range AvailablePlans {
		if p.ID == id {
			return &p
		}
	}
	return nil
}

// GetPlanLimits returns the limits for a given plan ID
func GetPlanLimits(planID string) PlanLimits {
	plan := GetPlanByID(planID)
	if plan == nil {
		// Default to free
		return AvailablePlans[0].Limits
	}
	return plan.Limits
}
