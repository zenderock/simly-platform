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

func (s *WebhookService) ListWebhooks(ctx context.Context, orgID int) ([]model.Webhook, error) {
	return s.store.GetWebhooksByOrganizationID(ctx, orgID)
}

// DispatchEvent finds webhooks for the org (and optional app) and sends payload
func (s *WebhookService) DispatchEvent(orgID int, appID *int, eventType string, payload interface{}) {
	webhooks, err := s.store.GetWebhooksByOrganizationID(context.Background(), orgID)
	if err != nil {
		fmt.Printf("Failed to fetch webhooks for dispatch: %v\n", err)
		return
	}

	for _, wh := range webhooks {
		// 1. Event Type Filter
		if wh.EventTypes != "" && wh.EventTypes != eventType {
			continue
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
