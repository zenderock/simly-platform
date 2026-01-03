package core

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type CaptchaService struct {
	secretKey string
}

func NewCaptchaService(secretKey string) *CaptchaService {
	return &CaptchaService{secretKey: secretKey}
}

type TurnstileResponse struct {
	Success     bool      `json:"success"`
	ChallengeTS time.Time `json:"challenge_ts"`
	Hostname    string    `json:"hostname"`
	ErrorCodes  []string  `json:"error-codes"`
}

func (s *CaptchaService) VerifyToken(ctx context.Context, token string) error {
	if s.secretKey == "" {
		// If no secret key is configured, skip verification (useful for dev)
		return nil
	}

	if token == "" {
		return fmt.Errorf("captcha token is required")
	}

	form := url.Values{}
	form.Add("secret", s.secretKey)
	form.Add("response", token)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://challenges.cloudflare.com/turnstile/v0/siteverify", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.PostForm = form

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", form)
	if err != nil {
		return fmt.Errorf("failed to verify captcha: %w", err)
	}
	defer resp.Body.Close()

	var turnstileResp TurnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&turnstileResp); err != nil {
		return fmt.Errorf("failed to decode turnstile response: %w", err)
	}

	if !turnstileResp.Success {
		return fmt.Errorf("captcha verification failed: %v", turnstileResp.ErrorCodes)
	}

	return nil
}
