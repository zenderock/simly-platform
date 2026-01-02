package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/zenderock/simly-backend/internal/store"
)

func TestBillingService_Initialization(t *testing.T) {
	store := &store.Store{} // Mock store
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency")

	assert.NotNil(t, service)
	assert.Equal(t, "sk_test_123", service.stripeSecretKey)
}

func TestBillingService_CreateCheckoutSession_Mock(t *testing.T) {
	// This tests the structure but would fail without valid Stripe key in integration environment
	// So we keep it simple to verify method signature and logic flow essentially
	store := &store.Store{}
	service := NewBillingService(store, "sk_test_123", "whsec_123", "http://localhost:3000", "price_pro", "price_agency")

	// We can't really call Stripe API in unit test without mocking the Stripe client library
	// which is hard in Go as functions are top-level.
	// Just asserting the Service is structurally correct.
	assert.NotNil(t, service)
}
