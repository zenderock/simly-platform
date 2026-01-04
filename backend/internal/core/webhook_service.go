package core

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type WebhookService struct {
	store *store.Store
}

func NewWebhookService(store *store.Store) *WebhookService {
	return &WebhookService{store: store}
}

func (s *WebhookService) RegisterWebhook(ctx context.Context, orgID int, req model.CreateWebhookRequest) (*model.Webhook, error) {
	// Generate secure secret
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	secret := "whsec_" + hex.EncodeToString(bytes)

	webhook := &model.Webhook{
		OrganizationID: orgID,
		ApplicationID:  req.ApplicationID,
		URL:            req.URL,
		Secret:         secret,
		EventTypes:     req.EventTypes,
	}

	if err := s.store.CreateWebhook(ctx, webhook); err != nil {
		return nil, err
	}
	return webhook, nil
}

func (s *WebhookService) ListWebhooks(ctx context.Context, orgID int, appID int) ([]model.Webhook, error) {
	webhooks, err := s.store.GetWebhooksByOrganizationID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if appID == 0 {
		return webhooks, nil
	}

	var filtered []model.Webhook
	for _, wh := range webhooks {
		// Include if AppID matches OR if webhook is global (nil) ??
		// Actually, if I am in App View, I probably only want to see Webhooks SPECIFIC to this App.
		// Or Global ones too? Global ones might fire for this app.
		// Let's assume strict scoping: only show webhooks created for this App.
		if wh.ApplicationID != nil && *wh.ApplicationID == appID {
			filtered = append(filtered, wh)
		}
	}
	return filtered, nil
}

// DispatchEvent finds webhooks for the org (and optional app) and sends payload
func (s *WebhookService) DispatchEvent(orgID int, appID *int, eventType string, payload interface{}) {
	webhooks, err := s.store.GetWebhooksByOrganizationID(context.Background(), orgID)
	if err != nil {
		fmt.Printf("Failed to fetch webhooks for dispatch: %v\n", err)
		return
	}

	for _, wh := range webhooks {
		// 1. Event Type Filter (support comma separated list)
		if wh.EventTypes != "" {
			subscribed := strings.Split(wh.EventTypes, ",")
			match := false
			for _, t := range subscribed {
				if strings.TrimSpace(t) == eventType {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}

		// 2. Application Scope Filter
		// If the Webhook is scoped to an App (wh.ApplicationID != nil),
		// it should ONLY trigger if the Event belongs to that App (appID != nil && match).
		// If Webhook is Global (nil), it triggers for everything (or maybe just org events?).
		// Policy:
		// - App-Scoped Webhook: Only fires if event.AppID matches wh.AppID.
		// - Org-Scoped Webhook (Global): Fires for ALL apps in the Org.

		if wh.ApplicationID != nil {
			if appID == nil {
				// Event is Org-level, but webhook is App-scoped -> Skip
				continue
			}
			if *wh.ApplicationID != *appID {
				// Event is for App A, webhook is for App B -> Skip
				continue
			}
		}

		go s.sendWebhook(wh, eventType, payload)
	}
}

func (s *WebhookService) sendWebhook(wh model.Webhook, eventType string, payload interface{}) {
	body, _ := json.Marshal(map[string]interface{}{
		"event":   eventType,
		"payload": payload,
	})

	req, _ := http.NewRequest("POST", wh.URL, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	// Add Signature
	mac := hmac.New(sha256.New, []byte(wh.Secret))
	mac.Write(body)
	signature := hex.EncodeToString(mac.Sum(nil))
	req.Header.Set("X-Simly-Signature", signature)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Webhook delivery failed to %s: %v\n", wh.URL, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		fmt.Printf("Webhook failed with status: %d\n", resp.StatusCode)
	}
}

func (s *WebhookService) DeleteWebhook(ctx context.Context, webhookID, orgID int) error {
	return s.store.DeleteWebhook(ctx, webhookID, orgID)
}

// TestWebhookResult represents the result of a webhook test
type TestWebhookResult struct {
	Success    bool
	StatusCode int
	Message    string
}

// SendTestWebhook sends a test payload to a webhook and returns the result
func (s *WebhookService) SendTestWebhook(wh model.Webhook) TestWebhookResult {
	// Create test payload
	testPayload := map[string]interface{}{
		"event": "test",
		"payload": map[string]interface{}{
			"message":    "This is a test webhook from Simly",
			"timestamp":  fmt.Sprintf("%d", time.Now().Unix()),
			"webhook_id": wh.ID,
		},
	}

	body, err := json.Marshal(testPayload)
	if err != nil {
		return TestWebhookResult{
			Success: false,
			Message: "Failed to create test payload",
		}
	}

	req, err := http.NewRequest("POST", wh.URL, bytes.NewBuffer(body))
	if err != nil {
		return TestWebhookResult{
			Success: false,
			Message: fmt.Sprintf("Failed to create request: %v", err),
		}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Simly-Webhook-Test/1.0")

	// Add Signature
	mac := hmac.New(sha256.New, []byte(wh.Secret))
	mac.Write(body)
	signature := hex.EncodeToString(mac.Sum(nil))
	req.Header.Set("X-Simly-Signature", signature)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return TestWebhookResult{
			Success: false,
			Message: fmt.Sprintf("Request failed: %v", err),
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return TestWebhookResult{
			Success:    true,
			StatusCode: resp.StatusCode,
			Message:    "Webhook received successfully",
		}
	}

	return TestWebhookResult{
		Success:    false,
		StatusCode: resp.StatusCode,
		Message:    fmt.Sprintf("Webhook returned status %d", resp.StatusCode),
	}
}
