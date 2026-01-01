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
	SMSMonthly       int `json:"sms_monthly"`
	SMSBurst         int `json:"sms_burst"`
	MaxDevices       int `json:"max_devices"` // -1 = unlimited
	MaxSimsPerDevice int `json:"max_sims_per_device"`
}

const (
	PlanFree   = "free"
	PlanPro    = "pro"
	PlanAgency = "agency"
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
			"100 SMS per month",
			"1 connection allowed",
			"Basic receipt webhooks",
			"Community support",
		},
		Limits: PlanLimits{
			SMSMonthly:       100,
			SMSBurst:         10,
			MaxDevices:       1,
			MaxSimsPerDevice: 1,
		},
		Popular: false,
	},
	{
		ID:          PlanPro,
		Name:        "Pro",
		Price:       1500, // $15
		Period:      "month",
		Description: "For startups and small businesses",
		Features: []string{
			"10,000 SMS per month",
			"Up to 3 devices",
			"Unlimited SIMs per device",
			"Priority delivery",
			"Email support",
		},
		Limits: PlanLimits{
			SMSMonthly:       10000,
			SMSBurst:         100,
			MaxDevices:       3,
			MaxSimsPerDevice: 2,
		},
		Popular: true,
	},
	{
		ID:          PlanAgency,
		Name:        "Agency",
		Price:       4900, // $49
		Period:      "month",
		Description: "For large campaigns and fleets",
		Features: []string{
			"Unlimited SMS",
			"Unlimited devices",
			"White-label options",
			"Priority support",
		},
		Limits: PlanLimits{
			SMSMonthly:       1000000, // Effectively unlimited
			SMSBurst:         1000,
			MaxDevices:       -1,
			MaxSimsPerDevice: 4,
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
