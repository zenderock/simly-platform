package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
)

type ApplicationService struct {
	store         *store.Store
	featureLimits *FeatureLimitManager
	httpClient    *http.Client
}

func NewApplicationService(store *store.Store, featureLimits *FeatureLimitManager) *ApplicationService {
	return &ApplicationService{
		store:         store,
		featureLimits: featureLimits,
		httpClient:    &http.Client{Timeout: 5 * time.Second},
	}
}

func (s *ApplicationService) WithStore(store *store.Store) *ApplicationService {
	return &ApplicationService{
		store:         store,
		featureLimits: s.featureLimits.WithStore(store),
		httpClient:    s.httpClient,
	}
}

func (s *ApplicationService) CreateApplication(ctx context.Context, orgID int, req model.CreateApplicationRequest) (*model.Application, error) {
	// Check feature limits
	if err := s.featureLimits.ValidateApplicationCreation(ctx, orgID); err != nil {
		return nil, err
	}

	// Verify Webhooks if provided
	if req.SlackWebhookURL != nil && *req.SlackWebhookURL != "" {
		if err := s.verifySlackWebhook(ctx, *req.SlackWebhookURL); err != nil {
			return nil, fmt.Errorf("slack webhook validation failed: %w", err)
		}
	}
	if req.NtfyTopic != nil && *req.NtfyTopic != "" {
		if err := s.verifyNtfyTopic(ctx, *req.NtfyTopic); err != nil {
			return nil, fmt.Errorf("ntfy topic validation failed: %w", err)
		}
	}

	app := &model.Application{
		OrganizationID:  orgID,
		Name:            req.Name,
		IsSandbox:       req.IsSandbox,
		SlackWebhookURL: req.SlackWebhookURL,
		NtfyTopic:       req.NtfyTopic,
		AlertSettings:   req.AlertSettings,
	}
	if err := s.store.CreateApplication(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

func (s *ApplicationService) ListApplications(ctx context.Context, orgID int) ([]model.Application, error) {
	return s.store.GetApplicationsByOrganizationID(ctx, orgID)
}

func (s *ApplicationService) GetApplication(ctx context.Context, appID int) (*model.Application, error) {
	return s.store.GetApplicationByID(ctx, appID)
}

func (s *ApplicationService) UpdateApplication(ctx context.Context, appID, orgID int, req model.UpdateApplicationRequest) (*model.Application, error) {
	currentApp, err := s.store.GetApplicationByID(ctx, appID)
	if err != nil {
		return nil, err
	}

	// Verify Slack Webhook if changed
	// Logic: if req has value AND (current is nil OR values differ)
	if req.SlackWebhookURL != nil && *req.SlackWebhookURL != "" {
		shouldVerify := false
		if currentApp.SlackWebhookURL == nil {
			shouldVerify = true
		} else if *req.SlackWebhookURL != *currentApp.SlackWebhookURL {
			shouldVerify = true
		}

		if shouldVerify {
			if err := s.verifySlackWebhook(ctx, *req.SlackWebhookURL); err != nil {
				return nil, fmt.Errorf("slack webhook validation failed: %w", err)
			}
		}
	}

	// Verify Ntfy Topic if changed
	if req.NtfyTopic != nil && *req.NtfyTopic != "" {
		shouldVerify := false
		if currentApp.NtfyTopic == nil {
			shouldVerify = true
		} else if *req.NtfyTopic != *currentApp.NtfyTopic {
			shouldVerify = true
		}

		if shouldVerify {
			if err := s.verifyNtfyTopic(ctx, *req.NtfyTopic); err != nil {
				return nil, fmt.Errorf("ntfy topic validation failed: %w", err)
			}
		}
	}

	if err := s.store.UpdateApplication(ctx, appID, orgID, req.Name, req.SlackWebhookURL, req.NtfyTopic, req.AlertSettings); err != nil {
		return nil, err
	}
	return s.store.GetApplicationByID(ctx, appID)
}

func (s *ApplicationService) DeleteApplication(ctx context.Context, appID, orgID int) error {
	return s.store.DeleteApplication(ctx, appID, orgID)
}

func (s *ApplicationService) verifySlackWebhook(ctx context.Context, url string) error {
	payload := map[string]string{
		"text": "Simly: Webhook connected successfully via Simly Platform.",
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("received status code %d", resp.StatusCode)
	}
	return nil
}

func (s *ApplicationService) verifyNtfyTopic(ctx context.Context, topic string) error {
	url := fmt.Sprintf("https://ntfy.sh/%s", topic)

	payload := "Simly: Topic connected successfully via Simly Platform."

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBufferString(payload))
	if err != nil {
		return err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("received status code %d", resp.StatusCode)
	}
	return nil
}
