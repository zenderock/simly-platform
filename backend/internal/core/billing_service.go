package core

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/stripe/stripe-go/v79"
	"github.com/stripe/stripe-go/v79/checkout/session"
	sub "github.com/stripe/stripe-go/v79/subscription"
	"github.com/stripe/stripe-go/v79/usagerecord"
	"github.com/stripe/stripe-go/v79/webhook"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

// BillingService handles Stripe billing integration
type BillingService struct {
	store             *store.Store
	stripeSecretKey   string
	webhookSecret     string
	frontendURL       string
	stripePricePro    string
	stripePriceAgency string
}

func NewBillingService(store *store.Store, stripeSecretKey, webhookSecret, frontendURL, stripePricePro, stripePriceAgency string) *BillingService {
	stripe.Key = stripeSecretKey
	return &BillingService{
		store:             store,
		stripeSecretKey:   stripeSecretKey,
		webhookSecret:     webhookSecret,
		frontendURL:       frontendURL,
		stripePricePro:    stripePricePro,
		stripePriceAgency: stripePriceAgency,
	}
}

// CreateCheckoutSession creates a Stripe checkout session
func (s *BillingService) CreateCheckoutSession(ctx context.Context, orgID int, priceID string, userEmail string) (string, error) {
	// Determine mode based on price type (subscription vs one-time)
	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(s.frontendURL + "/checkout/success"),
		CancelURL:  stripe.String(s.frontendURL + "/checkout/cancel"),
		Metadata: map[string]string{
			"organization_id": fmt.Sprintf("%d", orgID),
		},
	}

	if userEmail != "" {
		params.CustomerEmail = stripe.String(userEmail)
	}

	sess, err := session.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create checkout session: %w", err)
	}

	return sess.URL, nil
}

// CreatePortalSession creates a Stripe billing portal session
func (s *BillingService) CreatePortalSession(ctx context.Context, orgID int) (string, error) {
	// TODO: Implement Stripe portal session creation
	return "", fmt.Errorf("Stripe portal not implemented yet")
}

// HandleWebhook handles Stripe webhook events
func (s *BillingService) HandleWebhook(payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &session)
		if err != nil {
			log.Printf("Error parsing webhook JSON: %v", err)
			return err
		}

		// 1. Get Organization ID from Metadata
		orgIDStr := session.Metadata["organization_id"]
		if orgIDStr == "" {
			log.Printf("No organization_id in session metadata")
			return nil
		}
		orgID, _ := strconv.Atoi(orgIDStr)

		// 2. Update Organization Stripe Info
		customerID := session.Customer.ID
		subscriptionID := session.Subscription.ID
		if err := s.store.UpdateOrganizationStripe(context.Background(), orgID, customerID, subscriptionID); err != nil {
			log.Printf("Failed to update org stripe info: %v", err)
		}

		// 3. Retrieve Subscription to get Price ID (to determine plan)
		subscription, err := sub.Get(subscriptionID, nil)
		if err != nil {
			log.Printf("Failed to get subscription details: %v", err)
			return err
		}

		// Determine Plan ID from Price
		var planID string
		if len(subscription.Items.Data) > 0 {
			priceID := subscription.Items.Data[0].Price.ID
			if priceID == s.stripePricePro {
				planID = model.PlanPro
			} else if priceID == s.stripePriceAgency {
				planID = model.PlanAgency
			}
		}

		// 4. Update Organization Plan & Limits
		if planID != "" {
			limits := model.GetPlanLimits(planID)
			// Keeping SMSMonthlyLimit handled by model logic (e.g. -1 for unlimited)
			err = s.store.UpdateOrganizationPlan(
				context.Background(),
				orgID,
				planID,
				limits.SMSMonthly,
				limits.SMSBurst,
				limits.MaxDevices,
				limits.MaxSimsPerDevice,
				limits.MaxApplications,
				limits.MaxContacts,
				limits.MaxCampaigns,
				limits.MaxRecipientsPerCampaign,
			)
			if err != nil {
				log.Printf("Failed to upgrade organization plan: %v", err)
				return err
			}
			log.Printf("Organization %d upgraded to plan %s", orgID, planID)
		}

	case "invoice.paid":
		// Handle successful payment
		log.Println("Invoice paid")
	case "invoice.payment_failed":
		// Handle payment failure
		log.Println("Invoice payment failed")
	}

	return nil
}

// ReportUsageToStripe reports usage to Stripe Metered Billing API
func (s *BillingService) ReportUsageToStripe(ctx context.Context, orgID int, usageAmount int) error {
	// 1. Get Organization
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	if org.StripeSubscriptionID == nil || *org.StripeSubscriptionID == "" {
		// Log warning but don't fail, maybe they are on free tier/not set up yet
		log.Printf("Organization %d has no Stripe subscription, skipping usage report", orgID)
		return nil
	}

	// 2. Fetch Subscription to find the correct item (metered price)
	subscription, err := sub.Get(*org.StripeSubscriptionID, nil)
	if err != nil {
		return fmt.Errorf("failed to get subscription from Stripe: %w", err)
	}

	var subscriptionItemID string
	// Find the item that matches one of our known metered prices
	// For simplicity, we assume the first item is the relevant one or match by price ID if we had multiple
	if len(subscription.Items.Data) > 0 {
		for _, item := range subscription.Items.Data {
			// Logic to identify the correct item.
			// If we rely on the plan ID matching the price ID:
			if item.Price.ID == s.stripePricePro || item.Price.ID == s.stripePriceAgency {
				subscriptionItemID = item.ID
				break
			}
			// Fallback: use first item if simplistic
			subscriptionItemID = item.ID // Use first item as fallback
		}
	}

	if subscriptionItemID == "" {
		return fmt.Errorf("no valid subscription item found for usage reporting")
	}

	// 3. Create Usage Record
	params := &stripe.UsageRecordParams{
		SubscriptionItem: stripe.String(subscriptionItemID),
		Quantity:         stripe.Int64(int64(usageAmount)),
		Timestamp:        stripe.Int64(time.Now().Unix()),
		Action:           stripe.String(string(stripe.UsageRecordActionIncrement)),
	}

	_, err = usagerecord.New(params)
	if err != nil {
		return fmt.Errorf("failed to report usage to Stripe: %w", err)
	}

	return nil
}

// UpdateSubscription updates the Stripe subscription to a new price (plan)
func (s *BillingService) UpdateSubscription(ctx context.Context, orgID int, newPriceID string) error {
	org, err := s.store.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	if org.StripeSubscriptionID == nil || *org.StripeSubscriptionID == "" {
		return fmt.Errorf("organization has no active stripe subscription")
	}

	// Fetch current subscription
	subscription, err := sub.Get(*org.StripeSubscriptionID, nil)
	if err != nil {
		return fmt.Errorf("failed to retrieve subscription from Stripe: %w", err)
	}

	if len(subscription.Items.Data) == 0 {
		return fmt.Errorf("subscription has no items to update")
	}

	// Assume single item subscription for simplicity, or find the main item
	subscriptionItemID := subscription.Items.Data[0].ID

	// Update the subscription item to the new price
	params := &stripe.SubscriptionParams{
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    stripe.String(subscriptionItemID),
				Price: stripe.String(newPriceID),
			},
		},
	}

	_, err = sub.Update(*org.StripeSubscriptionID, params)
	if err != nil {
		return fmt.Errorf("failed to update stripe subscription: %w", err)
	}

	return nil
}
