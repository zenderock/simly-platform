package tests

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/zenderock/simly-backend/internal/model"
)

type publicAPIErrorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		Param   string `json:"param"`
	} `json:"error"`
}

type publicDeviceResponse struct {
	ID       int `json:"id"`
	SimCards []struct {
		SlotIndex   int    `json:"slot_index"`
		PhoneNumber string `json:"phone_number"`
		IsActive    bool   `json:"is_active"`
	} `json:"sim_cards"`
}

type publicMessageResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	To        string `json:"to"`
	Body      string `json:"body"`
	CreatedAt string `json:"created_at"`
}

type publicBrandingResponse struct {
	AppName      string `json:"app_name"`
	LogoURL      string `json:"logo_url"`
	PrimaryColor string `json:"primary_color"`
}

type publicLinkTokenResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at"`
}

type publicLinkTokenStatusResponse struct {
	Status     string `json:"status"`
	DeviceID   *int   `json:"device_id"`
	DeviceName string `json:"device_name"`
}

type publicCampaignResponse struct {
	ID            int    `json:"id"`
	ApplicationID *int   `json:"application_id"`
	Status        string `json:"status"`
	Name          string `json:"name"`
}

type publicCampaignLaunchResponse struct {
	Status     string `json:"status"`
	CampaignID string `json:"campaign_id"`
}

func TestPublicAPI(t *testing.T) {
	env := requirePublicAPITestEnv(t)

	t.Run("AuthMiddleware", func(t *testing.T) {
		fixture := seedPublicAPIFixture(t, env)

		cases := []struct {
			name        string
			headers     map[string]string
			status      int
			errorCode   string
			messagePart string
		}{
			{
				name:        "missing authorization header",
				headers:     map[string]string{},
				status:      http.StatusUnauthorized,
				errorCode:   "invalid_api_key",
				messagePart: "Missing Authorization header",
			},
			{
				name: "non bearer authorization header",
				headers: map[string]string{
					"Authorization": fixture.MainLiveKey,
				},
				status:      http.StatusUnauthorized,
				errorCode:   "invalid_api_key",
				messagePart: "Invalid Authorization header format",
			},
			{
				name: "jwt token rejected on public api",
				headers: map[string]string{
					"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.payload",
				},
				status:      http.StatusUnauthorized,
				errorCode:   "invalid_api_key",
				messagePart: "Invalid API key format",
			},
			{
				name: "revoked api key rejected",
				headers: map[string]string{
					"Authorization": "Bearer " + fixture.RevokedKey,
				},
				status:      http.StatusUnauthorized,
				errorCode:   "invalid_api_key",
				messagePart: "Invalid or revoked API key",
			},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				rr := env.executeRequest(t, http.MethodGet, "/v1/devices", nil, tc.headers)
				errResp := assertPublicError(t, rr, tc.status, tc.errorCode)
				if !strings.Contains(errResp.Error.Message, tc.messagePart) {
					t.Fatalf("expected error message to contain %q, got %q", tc.messagePart, errResp.Error.Message)
				}
			})
		}

		t.Run("valid live key injects app scoped context", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, "/v1/devices", nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			devices := decodeJSON[[]publicDeviceResponse](t, rr)
			if len(devices) != 1 {
				t.Fatalf("expected 1 device for app-scoped key, got %d", len(devices))
			}
			if devices[0].ID != fixture.MainDeviceID {
				t.Fatalf("expected main device id %d, got %d", fixture.MainDeviceID, devices[0].ID)
			}
		})
	})

	t.Run("Devices", func(t *testing.T) {
		fixture := seedPublicAPIFixture(t, env)

		rr := env.executeRequest(t, http.MethodGet, "/v1/devices", nil, authHeaders(fixture.MainLiveKey))
		assertStatus(t, rr, http.StatusOK)

		devices := decodeJSON[[]publicDeviceResponse](t, rr)
		if len(devices) != 1 {
			t.Fatalf("expected exactly one device for the app-scoped key, got %d", len(devices))
		}
		if devices[0].ID != fixture.MainDeviceID {
			t.Fatalf("expected device %d, got %d", fixture.MainDeviceID, devices[0].ID)
		}
		if len(devices[0].SimCards) != 1 {
			t.Fatalf("expected one SIM card, got %d", len(devices[0].SimCards))
		}
		if devices[0].SimCards[0].SlotIndex != 0 || !devices[0].SimCards[0].IsActive {
			t.Fatalf("expected active SIM on slot 0, got %+v", devices[0].SimCards[0])
		}
		if devices[0].ID == fixture.SecondaryDeviceID {
			t.Fatalf("unexpected secondary device %d in response", fixture.SecondaryDeviceID)
		}
	})

	t.Run("BrandingAndLinkTokens", func(t *testing.T) {
		fixture := seedPublicAPIFixture(t, env)

		t.Run("custom white label branding", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, "/v1/branding", nil, authHeaders(fixture.WhiteLabelCustomKey))
			assertStatus(t, rr, http.StatusOK)

			branding := decodeJSON[publicBrandingResponse](t, rr)
			if branding.AppName != "Custom Gateway" {
				t.Fatalf("expected custom app name, got %q", branding.AppName)
			}
			if branding.LogoURL != "https://example.com/logo.png" {
				t.Fatalf("expected custom logo URL, got %q", branding.LogoURL)
			}
			if branding.PrimaryColor != "#0F4C81" {
				t.Fatalf("expected custom color, got %q", branding.PrimaryColor)
			}
		})

		t.Run("default white label branding fallback", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, "/v1/branding", nil, authHeaders(fixture.WhiteLabelDefaultKey))
			assertStatus(t, rr, http.StatusOK)

			branding := decodeJSON[publicBrandingResponse](t, rr)
			if branding.AppName != "Simly Gateway" {
				t.Fatalf("expected default app name, got %q", branding.AppName)
			}
			if branding.LogoURL != "" {
				t.Fatalf("expected empty default logo URL, got %q", branding.LogoURL)
			}
			if branding.PrimaryColor != "#8c52ff" {
				t.Fatalf("expected default primary color, got %q", branding.PrimaryColor)
			}
		})

		t.Run("non white label branding forbidden", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, "/v1/branding", nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusForbidden)
			assertBodyContains(t, rr, "white-label plan required")
		})

		t.Run("generate link token success", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodPost, "/v1/devices/link-token", []byte("{}"), authHeaders(fixture.WhiteLabelDefaultKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicLinkTokenResponse](t, rr)
			if resp.Token == "" {
				t.Fatal("expected generated token to be present")
			}
			if resp.ExpiresAt == "" {
				t.Fatal("expected generated token expiry to be present")
			}
		})

		t.Run("generate link token forbidden without white label", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodPost, "/v1/devices/link-token", []byte("{}"), authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusForbidden)
			assertBodyContains(t, rr, "white-label plan required")
		})

		t.Run("pending link token status", func(t *testing.T) {
			path := fmt.Sprintf("/v1/devices/link-token/%s", fixture.WhiteLabelPendingToken)
			rr := env.executeRequest(t, http.MethodGet, path, nil, authHeaders(fixture.WhiteLabelDefaultKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicLinkTokenStatusResponse](t, rr)
			if resp.Status != "pending" {
				t.Fatalf("expected pending status, got %q", resp.Status)
			}
		})

		t.Run("used link token status", func(t *testing.T) {
			path := fmt.Sprintf("/v1/devices/link-token/%s", fixture.WhiteLabelUsedToken)
			rr := env.executeRequest(t, http.MethodGet, path, nil, authHeaders(fixture.WhiteLabelDefaultKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicLinkTokenStatusResponse](t, rr)
			if resp.Status != "success" {
				t.Fatalf("expected success status, got %q", resp.Status)
			}
			if resp.DeviceID == nil {
				t.Fatal("expected used token response to include device_id")
			}
		})

		t.Run("expired link token status", func(t *testing.T) {
			expiredToken := createDeviceLinkTokenForTest(t, context.Background(), env, fixture.WhiteLabelDefaultOrgID, fixture.WhiteLabelDefaultAppID, nextPublicAPITestSuffix()+"-expired", time.Now().Add(-time.Minute))
			path := fmt.Sprintf("/v1/devices/link-token/%s", expiredToken)
			rr := env.executeRequest(t, http.MethodGet, path, nil, authHeaders(fixture.WhiteLabelDefaultKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicLinkTokenStatusResponse](t, rr)
			if resp.Status != "expired" {
				t.Fatalf("expected expired status, got %q", resp.Status)
			}
		})

		t.Run("invalid link token surfaces current backend behavior", func(t *testing.T) {
			path := fmt.Sprintf("/v1/devices/link-token/%s", nextPublicAPITestSuffix()+"-missing-token")
			rr := env.executeRequest(t, http.MethodGet, path, nil, authHeaders(fixture.WhiteLabelDefaultKey))
			assertPublicError(t, rr, http.StatusInternalServerError, "internal_error")
		})
	})

	t.Run("Messages", func(t *testing.T) {
		t.Run("send live message", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages", map[string]string{
				"to":   "+33612345678",
				"body": "Hello from public API",
			}, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusCreated)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if !strings.HasPrefix(resp.ID, "msg_") {
				t.Fatalf("expected prefixed message id, got %q", resp.ID)
			}
			if resp.Status != "queued" {
				t.Fatalf("expected queued live status, got %q", resp.Status)
			}
		})

		t.Run("send sandbox message", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages", map[string]string{
				"to":   "+33612345679",
				"body": "Sandbox hello",
			}, authHeaders(fixture.MainSandboxKey))
			assertStatus(t, rr, http.StatusCreated)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if resp.Status != "delivered" {
				t.Fatalf("expected delivered sandbox status, got %q", resp.Status)
			}
		})

		t.Run("sandbox key bound to live app is rejected", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages", map[string]string{
				"to":   "+33612345678",
				"body": "Should fail",
			}, authHeaders(fixture.MismatchSandboxKey))
			errResp := assertPublicError(t, rr, http.StatusBadRequest, "invalid_request")
			if !strings.Contains(errResp.Error.Message, "sandbox applications") {
				t.Fatalf("expected sandbox mismatch message, got %q", errResp.Error.Message)
			}
		})

		t.Run("validation errors", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)

			cases := []struct {
				name        string
				rawBody     []byte
				payload     any
				status      int
				errorCode   string
				param       string
				messagePart string
			}{
				{
					name:        "invalid json body",
					rawBody:     []byte(`{"to":`),
					status:      http.StatusBadRequest,
					errorCode:   "invalid_request",
					messagePart: "Invalid JSON request body",
				},
				{
					name: "missing to",
					payload: map[string]string{
						"body": "Missing recipient",
					},
					status:      http.StatusBadRequest,
					errorCode:   "missing_parameter",
					param:       "to",
					messagePart: "Required parameter is missing: to",
				},
				{
					name: "missing body",
					payload: map[string]string{
						"to": "+33612345678",
					},
					status:      http.StatusBadRequest,
					errorCode:   "missing_parameter",
					param:       "body",
					messagePart: "Required parameter is missing: body",
				},
				{
					name: "invalid e164 number",
					payload: map[string]string{
						"to":   "0612345678",
						"body": "Bad number",
					},
					status:      http.StatusBadRequest,
					errorCode:   "invalid_request",
					param:       "to",
					messagePart: "valid E.164 phone number",
				},
				{
					name: "message body too long",
					payload: map[string]string{
						"to":   "+33612345678",
						"body": strings.Repeat("a", 1601),
					},
					status:      http.StatusBadRequest,
					errorCode:   "invalid_request",
					param:       "body",
					messagePart: "must not exceed 1600 characters",
				},
			}

			for _, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					var rr *httptest.ResponseRecorder
					if tc.rawBody != nil {
						rr = env.executeRequest(t, http.MethodPost, "/v1/messages", tc.rawBody, authHeaders(fixture.MainLiveKey))
					} else {
						rr = env.executeJSONRequest(t, http.MethodPost, "/v1/messages", tc.payload, authHeaders(fixture.MainLiveKey))
					}

					errResp := assertPublicError(t, rr, tc.status, tc.errorCode)
					if tc.param != "" && errResp.Error.Param != tc.param {
						t.Fatalf("expected error param %q, got %q", tc.param, errResp.Error.Param)
					}
					if !strings.Contains(errResp.Error.Message, tc.messagePart) {
						t.Fatalf("expected error message to contain %q, got %q", tc.messagePart, errResp.Error.Message)
					}
				})
			}
		})

		t.Run("no devices available", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages", map[string]string{
				"to":   "+33612345678",
				"body": "No device path",
			}, authHeaders(fixture.NoDeviceKey))
			assertStatus(t, rr, http.StatusCreated)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if resp.Status != "queued" {
				t.Fatalf("expected queued status for async no-device flow, got %q", resp.Status)
			}
		})
	})

	t.Run("OTP", func(t *testing.T) {
		t.Run("send otp", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages/otp", map[string]string{
				"to":   "+33612345678",
				"body": "Your code is 123456",
			}, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusCreated)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if resp.Status != "queued" {
				t.Fatalf("expected queued OTP status, got %q", resp.Status)
			}
		})

		t.Run("otp body too long", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages/otp", map[string]string{
				"to":   "+33612345678",
				"body": strings.Repeat("1", 81),
			}, authHeaders(fixture.MainLiveKey))
			errResp := assertPublicError(t, rr, http.StatusBadRequest, "invalid_request")
			if errResp.Error.Param != "body" {
				t.Fatalf("expected body param, got %q", errResp.Error.Param)
			}
		})

		t.Run("otp burst requests stay within current limiter behavior", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			ctx := context.Background()
			if err := env.Store.UpdateOrganizationPlan(ctx, fixture.MainOrgID, model.PlanPro, -1, 1, 2, 1, 5, 1000, 5, 1000); err != nil {
				t.Fatalf("failed to lower burst limit: %v", err)
			}

			for i := 0; i < 5; i++ {
				rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages/otp", map[string]string{
					"to":   fmt.Sprintf("+3361234567%d", i),
					"body": "Rate limit probe",
				}, authHeaders(fixture.MainLiveKey))

				if rr.Code == http.StatusTooManyRequests {
					assertPublicError(t, rr, http.StatusTooManyRequests, "rate_limit_exceeded")
					continue
				}
				if rr.Code != http.StatusCreated {
					t.Fatalf("expected OTP request to be created or rate-limited, got %d body=%s", rr.Code, rr.Body.String())
				}
			}
		})

		t.Run("sandbox mismatch is rejected on otp", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages/otp", map[string]string{
				"to":   "+33612345678",
				"body": "OTP 123456",
			}, authHeaders(fixture.MismatchSandboxKey))
			errResp := assertPublicError(t, rr, http.StatusBadRequest, "invalid_request")
			if !strings.Contains(errResp.Error.Message, "sandbox applications") {
				t.Fatalf("expected sandbox mismatch message, got %q", errResp.Error.Message)
			}
		})

		t.Run("otp no devices available", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeJSONRequest(t, http.MethodPost, "/v1/messages/otp", map[string]string{
				"to":   "+33612345678",
				"body": "OTP no device",
			}, authHeaders(fixture.NoDeviceKey))
			assertStatus(t, rr, http.StatusCreated)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if resp.Status != "queued" {
				t.Fatalf("expected queued OTP status for async no-device flow, got %q", resp.Status)
			}
		})
	})

	t.Run("GetMessage", func(t *testing.T) {
		fixture := seedPublicAPIFixture(t, env)

		t.Run("get message with prefixed id", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, fmt.Sprintf("/v1/messages/msg_%d", fixture.MainMessageID), nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if resp.ID != fmt.Sprintf("msg_%d", fixture.MainMessageID) {
				t.Fatalf("expected prefixed message id, got %q", resp.ID)
			}
		})

		t.Run("get message with numeric id", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, fmt.Sprintf("/v1/messages/%d", fixture.MainMessageID), nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicMessageResponse](t, rr)
			if resp.ID != fmt.Sprintf("msg_%d", fixture.MainMessageID) {
				t.Fatalf("expected normalized message id, got %q", resp.ID)
			}
		})

		t.Run("invalid message id", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, "/v1/messages/not-a-number", nil, authHeaders(fixture.MainLiveKey))
			assertPublicError(t, rr, http.StatusBadRequest, "invalid_request")
		})

		t.Run("missing message", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, "/v1/messages/999999999", nil, authHeaders(fixture.MainLiveKey))
			assertPublicError(t, rr, http.StatusNotFound, "resource_not_found")
		})

		t.Run("other organization message not visible", func(t *testing.T) {
			rr := env.executeRequest(t, http.MethodGet, fmt.Sprintf("/v1/messages/%d", fixture.OtherOrgMessageID), nil, authHeaders(fixture.MainLiveKey))
			assertPublicError(t, rr, http.StatusNotFound, "resource_not_found")
		})
	})

	t.Run("Campaigns", func(t *testing.T) {
		t.Run("list campaigns keeps app isolation", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodGet, "/v1/campaigns", nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			campaigns := decodeJSON[[]publicCampaignResponse](t, rr)
			if len(campaigns) != 2 {
				t.Fatalf("expected 2 campaigns for app-scoped key, got %d", len(campaigns))
			}
			for _, campaign := range campaigns {
				if campaign.ID == fixture.OtherAppDraftCampaignID || campaign.ID == fixture.OtherOrgCampaignID {
					t.Fatalf("unexpected campaign %d leaked into app-scoped list", campaign.ID)
				}
				if campaign.ApplicationID == nil || *campaign.ApplicationID != fixture.MainAppID {
					t.Fatalf("expected campaign to stay scoped to app %d, got %+v", fixture.MainAppID, campaign.ApplicationID)
				}
			}
		})

		t.Run("list campaigns by status keeps app isolation", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodGet, "/v1/campaigns?status=draft", nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			campaigns := decodeJSON[[]publicCampaignResponse](t, rr)
			if len(campaigns) != 1 {
				t.Fatalf("expected exactly one draft campaign for scoped app, got %d", len(campaigns))
			}
			if campaigns[0].ID != fixture.MainDraftCampaignID {
				t.Fatalf("expected draft campaign %d, got %d", fixture.MainDraftCampaignID, campaigns[0].ID)
			}
		})

		t.Run("get campaign success", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodGet, fmt.Sprintf("/v1/campaigns/%d", fixture.MainDraftCampaignID), nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			campaign := decodeJSON[publicCampaignResponse](t, rr)
			if campaign.ID != fixture.MainDraftCampaignID {
				t.Fatalf("expected campaign %d, got %d", fixture.MainDraftCampaignID, campaign.ID)
			}
		})

		t.Run("get campaign invalid id", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodGet, "/v1/campaigns/nope", nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusBadRequest)
			assertBodyContains(t, rr, "Invalid campaign ID")
		})

		t.Run("get campaign from other organization not found", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodGet, fmt.Sprintf("/v1/campaigns/%d", fixture.OtherOrgCampaignID), nil, authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusNotFound)
			assertBodyContains(t, rr, "Campaign not found")
		})

		t.Run("launch draft campaign and reject relaunch", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			path := fmt.Sprintf("/v1/campaigns/%d/launch", fixture.MainDraftCampaignID)

			first := env.executeRequest(t, http.MethodPost, path, []byte("{}"), authHeaders(fixture.MainLiveKey))
			assertStatus(t, first, http.StatusOK)

			resp := decodeJSON[publicCampaignLaunchResponse](t, first)
			if resp.Status != "launched" {
				t.Fatalf("expected launch status, got %q", resp.Status)
			}

			second := env.executeRequest(t, http.MethodPost, path, []byte("{}"), authHeaders(fixture.MainLiveKey))
			assertStatus(t, second, http.StatusBadRequest)
			assertBodyContains(t, second, "campaign already launched or processing")
		})

		t.Run("launch scheduled campaign", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			path := fmt.Sprintf("/v1/campaigns/%d/launch", fixture.MainScheduledCampaignID)

			rr := env.executeRequest(t, http.MethodPost, path, []byte("{}"), authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusOK)

			resp := decodeJSON[publicCampaignLaunchResponse](t, rr)
			if resp.Status != "launched" {
				t.Fatalf("expected launch status, got %q", resp.Status)
			}
		})

		t.Run("launch campaign invalid id", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodPost, "/v1/campaigns/nope/launch", []byte("{}"), authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusBadRequest)
			assertBodyContains(t, rr, "Invalid campaign ID")
		})

		t.Run("launch campaign from other organization not found", func(t *testing.T) {
			fixture := seedPublicAPIFixture(t, env)
			rr := env.executeRequest(t, http.MethodPost, fmt.Sprintf("/v1/campaigns/%d/launch", fixture.OtherOrgCampaignID), []byte("{}"), authHeaders(fixture.MainLiveKey))
			assertStatus(t, rr, http.StatusNotFound)
			assertBodyContains(t, rr, "Campaign not found")
		})
	})
}

func authHeaders(apiKey string) map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + apiKey,
	}
}

func assertStatus(t *testing.T, rr *httptest.ResponseRecorder, expected int) {
	t.Helper()

	if rr.Code != expected {
		t.Fatalf("expected status %d, got %d\nbody: %s", expected, rr.Code, rr.Body.String())
	}
}

func assertPublicError(t *testing.T, rr *httptest.ResponseRecorder, expectedStatus int, expectedCode string) publicAPIErrorResponse {
	t.Helper()

	assertStatus(t, rr, expectedStatus)
	errResp := decodeJSON[publicAPIErrorResponse](t, rr)
	if errResp.Error.Code != expectedCode {
		t.Fatalf("expected error code %q, got %q", expectedCode, errResp.Error.Code)
	}
	return errResp
}

func assertBodyContains(t *testing.T, rr *httptest.ResponseRecorder, expected string) {
	t.Helper()

	if !strings.Contains(rr.Body.String(), expected) {
		t.Fatalf("expected body to contain %q, got %q", expected, rr.Body.String())
	}
}
