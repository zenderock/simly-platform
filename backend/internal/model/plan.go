package model

// Plan represents a subscription plan with its limits
type Plan struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Price       int        `json:"price"` // in cents
	Period      string     `json:"period"`
	Description string     `json:"description"`
	Features    []string   `json:"features"`
	Limits      PlanLimits `json:"limits"`
	Popular     bool       `json:"popular"`
}

type PlanLimits struct {
	SMSMonthly       int `json:"sms_monthly"`
	SMSBurst         int `json:"sms_burst"`
	MaxDevices       int `json:"max_devices"` // -1 = unlimited
	MaxSimsPerDevice int `json:"max_sims_per_device"`
}

// AvailablePlans returns all available subscription plans
var AvailablePlans = []Plan{
	{
		ID:          "starter",
		Name:        "Starter",
		Price:       2900, // $29
		Period:      "month",
		Description: "Perfect for small projects and testing",
		Features: []string{
			"1,000 SMS per month",
			"Up to 2 devices",
			"1 SIM per device",
			"Basic support",
			"API access",
			"Webhook support",
		},
		Limits: PlanLimits{
			SMSMonthly:       1000,
			SMSBurst:         100,
			MaxDevices:       2,
			MaxSimsPerDevice: 1,
		},
		Popular: false,
	},
	{
		ID:          "professional",
		Name:        "Professional",
		Price:       9900, // $99
		Period:      "month",
		Description: "Ideal for growing businesses",
		Features: []string{
			"10,000 SMS per month",
			"Up to 10 devices",
			"2 SIMs per device",
			"Priority support",
			"Advanced analytics",
			"Custom webhooks",
			"Rate limiting controls",
		},
		Limits: PlanLimits{
			SMSMonthly:       10000,
			SMSBurst:         500,
			MaxDevices:       10,
			MaxSimsPerDevice: 2,
		},
		Popular: true,
	},
	{
		ID:          "enterprise",
		Name:        "Enterprise",
		Price:       29900, // $299
		Period:      "month",
		Description: "For large-scale operations",
		Features: []string{
			"50,000 SMS per month",
			"Unlimited devices",
			"4 SIMs per device",
			"24/7 dedicated support",
			"Custom integrations",
			"SLA guarantee",
			"Advanced security",
			"Multi-organization support",
		},
		Limits: PlanLimits{
			SMSMonthly:       50000,
			SMSBurst:         2000,
			MaxDevices:       -1, // unlimited
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
		// Default to starter
		return AvailablePlans[0].Limits
	}
	return plan.Limits
}
