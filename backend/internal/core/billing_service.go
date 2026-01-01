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
	"github.com/zenderock/simly-backend/internal/model"
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
	planName := model.PlanFree

	switch priceID {
	case s.pricePro:
		planName = model.PlanPro
	case s.priceAgency:
		planName = model.PlanAgency
	default:
		log.Printf("Billing: Unknown price ID %s, defaulting to free", priceID)
	}

	limits := model.GetPlanLimits(planName)

	log.Printf("Billing: Updating org %d to plan %s with limits: SMS=%d, Devices=%d", org.ID, planName, limits.SMSMonthly, limits.MaxDevices)

	return s.db.UpdateOrganizationPlan(context.Background(), org.ID, planName, limits.SMSMonthly, limits.SMSBurst, limits.MaxDevices, limits.MaxSimsPerDevice)
}

func (s *BillingService) handleSubscriptionDeleted(sub *stripe.Subscription) error {
	org, err := s.db.GetOrganizationByStripeCustomerID(context.Background(), sub.Customer.ID)
	if err != nil {
		return nil
	}

	planName := model.PlanFree
	limits := model.GetPlanLimits(planName)

	log.Printf("Billing: Subscription deleted for org %d, downgrading to free", org.ID)

	return s.db.UpdateOrganizationPlan(context.Background(), org.ID, planName, limits.SMSMonthly, limits.SMSBurst, limits.MaxDevices, limits.MaxSimsPerDevice)
}
