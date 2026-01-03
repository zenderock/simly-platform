package core

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type EmailValidator struct {
	client *http.Client
	apiURL string
}

func NewEmailValidator() *EmailValidator {
	return &EmailValidator{
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		apiURL: "https://rapid-email-verifier.fly.dev/api/validate",
	}
}

type EmailValidationResult struct {
	Email       string `json:"email"`
	Validations struct {
		Syntax        bool `json:"syntax"`
		DomainExists  bool `json:"domain_exists"`
		MxRecords     bool `json:"mx_records"`
		MailboxExists bool `json:"mailbox_exists"`
		IsDisposable  bool `json:"is_disposable"`
		IsRoleBased   bool `json:"is_role_based"`
	} `json:"validations"`
	Score  float64 `json:"score"`
	Status string  `json:"status"`
}

var (
	ErrInvalidEmailSyntax     = fmt.Errorf("invalid email syntax")
	ErrInvalidEmailDomain     = fmt.Errorf("invalid email domain or no MX records")
	ErrDisposableEmail        = fmt.Errorf("disposable email addresses are not allowed")
	ErrEmailValidationFailure = fmt.Errorf("failed to validate email")
)

func (v *EmailValidator) Validate(ctx context.Context, email string) error {
	params := url.Values{}
	params.Add("email", email)

	req, err := http.NewRequestWithContext(ctx, "GET", v.apiURL+"?"+params.Encode(), nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := v.client.Do(req)
	if err != nil {
		// If the validation service is down, do we block registration?
		// For now, let's log and allow, OR block.
		// User requested integration, implying they want it to work.
		// Failing open (allowing) might be safer for UX if external service is flaky,
		// but failing closed (blocking) ensures quality.
		// Let's return error for now to be strict.
		return fmt.Errorf("email validation request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("email validation service returned status: %d", resp.StatusCode)
	}

	var result EmailValidationResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	// Logic based on requirements
	if !result.Validations.Syntax {
		return ErrInvalidEmailSyntax
	}

	if !result.Validations.MxRecords {
		return ErrInvalidEmailDomain
	}

	if result.Validations.IsDisposable {
		return ErrDisposableEmail
	}

	// Optional: Check score?
	// User example showed score: 40 for "NO_MX_RECORDS".
	// If MX are present, score should be higher.

	return nil
}
