package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type ResendEmailProvider struct {
	apiKey    string
	fromEmail string
}

func NewResendEmailProvider(apiKey string, fromEmail string) *ResendEmailProvider {
	return &ResendEmailProvider{
		apiKey:    apiKey,
		fromEmail: fromEmail,
	}
}

func (p *ResendEmailProvider) SendEmail(ctx context.Context, to string, subject string, htmlContent string) error {
	if p.apiKey == "" {
		fmt.Printf("[EMAIL-STUB] To: %s, Subject: %s\n", to, subject)
		return nil
	}

	url := "https://api.resend.com/emails"

	payload := map[string]interface{}{
		"from":    p.fromEmail,
		"to":      to,
		"subject": subject,
		"html":    htmlContent,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errResp interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("resend api error (status %d): %v", resp.StatusCode, errResp)
	}

	return nil
}
