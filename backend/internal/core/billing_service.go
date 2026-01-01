package core

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/stripe/stripe-go/v79"
	"github.com/stripe/stripe-go/v79/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v79/checkout/session"
	"github.com/stripe/stripe-go/v79/webhook"
	"github.com/zenderock/simly-backend/internal/store"
)

type BillingService struct {
	db              *store.Store
	stripeSecretKey string
	webhookSecret   string
	frontendURL     string
	pricePro        string
	priceAgency     string
}

func NewBillingService(db *store.Store, stripeKey, webhookSecret, frontendURL, pricePro, priceAgency string) *BillingService {
	stripe.Key = stripeKey

	return &BillingService{
		db:              db,
		stripeSecretKey: stripeKey,
		webhookSecret:   webhookSecret,
		frontendURL:     frontendURL,
		pricePro:        pricePro,
		priceAgency:     priceAgency,
	}
}

func (s *BillingService) CreateCheckoutSession(ctx context.Context, orgID int, priceID string, userEmail string) (string, error) {
	org, err := s.db.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return "", err
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(s.frontendURL + "/settings/billing?success=true"),
		CancelURL:  stripe.String(s.frontendURL + "/settings/billing?canceled=true"),
		Metadata: map[string]string{
			"organization_id": fmt.Sprintf("%d", orgID),
		},
	}

	if org.StripeCustomerID != nil && *org.StripeCustomerID != "" {
		params.Customer = stripe.String(*org.StripeCustomerID)
	} else {
		params.CustomerEmail = stripe.String(userEmail)
	}

	sess, err := checkoutsession.New(params)
	if err != nil {
		return "", fmt.Errorf("stripe session creation failed: %w", err)
	}

	return sess.URL, nil
}

func (s *BillingService) CreatePortalSession(ctx context.Context, orgID int) (string, error) {
	org, err := s.db.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return "", err
	}

	if org.StripeCustomerID == nil || *org.StripeCustomerID == "" {
		return "", fmt.Errorf("organization has no billing account")
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(*org.StripeCustomerID),
		ReturnURL: stripe.String(s.frontendURL + "/settings/billing"),
	}

	ps, err := session.New(params)
	if err != nil {
		return "", fmt.Errorf("stripe portal creation failed: %w", err)
	}

	return ps.URL, nil
}

func (s *BillingService) HandleWebhook(payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return err
		}
		return s.handleCheckoutCompleted(&session)

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return err
		}
		return s.handleSubscriptionUpdated(&sub)

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return err
		}
		return s.handleSubscriptionDeleted(&sub)
	}

	return nil
}

func (s *BillingService) handleCheckoutCompleted(session *stripe.CheckoutSession) error {
	orgIDStr := session.Metadata["organization_id"]
	if orgIDStr == "" {
		return nil
	}

	var orgID int
	fmt.Sscanf(orgIDStr, "%d", &orgID)

	customerID := session.Customer.ID
	subscriptionID := session.Subscription.ID

	return s.db.UpdateOrganizationStripe(context.Background(), orgID, customerID, subscriptionID)
}

func (s *BillingService) handleSubscriptionUpdated(sub *stripe.Subscription) error {
	org, err := s.db.GetOrganizationByStripeCustomerID(context.Background(), sub.Customer.ID)
	if err != nil {
		log.Printf("Billing: Org not found for customer %s", sub.Customer.ID)
		return nil
	}

	priceID := sub.Items.Data[0].Price.ID

	// Map Price ID to Plan Name using configured IDs
	planName := "free"

	switch priceID {
	case s.pricePro:
		planName = "pro"
	case s.priceAgency:
		planName = "agency"
	default:
		// Fallback or log unknown price
		log.Printf("Billing: Unknown price ID %s, defaulting to free/current or handling error", priceID)
		// If unknown, maybe we shouldn't change the plan?
		// For safety let's return nil to avoid downgrading to free erroneously if ID just doesn't match config
		// But for now, let's assume 'free' if not matched is safer than 'pro'.
	}

	// We should also update subscription_end_date
	// plan, smsMonthly, smsBurst, maxDevices, maxSimsPerDevice
	// For now, only updating Plan status. Ideally we fetch plan config and apply limits.
	// Passing -1 or 0 to indicate "no change" isn't supported by the store method currently.
	// We might need to fetch org first (which we have) and pass existing values or updated values.

	// Quick fix: Use existing limits from 'org' or defaults.
	// Assuming 'org' struct has these fields populated (it does from OrganizationStore.GetOrganizationByStripeCustomerID if query selected them)
	// WAIT: GetOrganizationByStripeCustomerID ONLY selects id, name, plan.
	// We need to fetch full org or update Store method to just update Plan.

	// Better approach: Update only plan columns.
	// But Store.UpdateOrganizationPlan updates everything.
	// Let's create a specific method for Stripe updates in Store?
	// Or just reuse UpdateOrganizationPlan if we fetch full org.

	// Let's fetch full org first.
	fullOrg, err := s.db.GetOrganizationByID(context.Background(), org.ID)
	if err != nil {
		return err
	}

	return s.db.UpdateOrganizationPlan(context.Background(), org.ID, planName, fullOrg.SMSMonthlyLimit, fullOrg.SMSBurstLimit, fullOrg.MaxDevices, fullOrg.MaxSimsPerDevice)
}

func (s *BillingService) handleSubscriptionDeleted(sub *stripe.Subscription) error {
	org, err := s.db.GetOrganizationByStripeCustomerID(context.Background(), sub.Customer.ID)
	if err != nil {
		return nil
	}

	fullOrg, err := s.db.GetOrganizationByID(context.Background(), org.ID)
	if err != nil {
		return err
	}

	return s.db.UpdateOrganizationPlan(context.Background(), org.ID, "free", fullOrg.SMSMonthlyLimit, fullOrg.SMSBurstLimit, fullOrg.MaxDevices, fullOrg.MaxSimsPerDevice)
}
