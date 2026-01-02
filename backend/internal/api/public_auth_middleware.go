package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/zenderock/simly-backend/internal/core"
)

// Context keys for Public API
const (
	publicOrgIDKey     contextKey = "public_org_id"
	publicAppIDKey     contextKey = "public_app_id"
	publicAPIKeyIDKey  contextKey = "public_api_key_id"
	publicIsSandboxKey contextKey = "public_is_sandbox"
)

// API Key prefixes
const (
	LiveKeyPrefix = "sk_live_"
	TestKeyPrefix = "sk_test_"
)

// PublicAPIAuthMiddleware creates a middleware that authenticates requests using API keys only.
// It accepts only sk_live_* and sk_test_* tokens, rejecting JWT tokens.
// Sets context values: org_id, app_id, api_key_id, is_sandbox (based on key prefix)
func PublicAPIAuthMiddleware(apiKeyService *core.APIKeyService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				AuthError(w, "Missing Authorization header")
				return
			}

			// Must be Bearer token
			if !strings.HasPrefix(authHeader, "Bearer ") {
				AuthError(w, "Invalid Authorization header format. Expected: Bearer <api_key>")
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == "" {
				AuthError(w, "Missing API key in Authorization header")
				return
			}

			// Determine if it's a test or live key
			var isSandbox bool
			if strings.HasPrefix(token, TestKeyPrefix) {
				isSandbox = true
			} else if strings.HasPrefix(token, LiveKeyPrefix) {
				isSandbox = false
			} else {
				// Reject JWT tokens and any other format
				AuthError(w, "Invalid API key format. Expected sk_live_* or sk_test_* key")
				return
			}

			// Verify the API key
			apiKey, err := apiKeyService.VerifyAPIKey(r.Context(), token)
			if err != nil {
				AuthError(w, "Invalid or revoked API key")
				return
			}

			// Set context values
			ctx := r.Context()
			ctx = context.WithValue(ctx, publicOrgIDKey, apiKey.OrganizationID)
			ctx = context.WithValue(ctx, publicAppIDKey, apiKey.ApplicationID)
			ctx = context.WithValue(ctx, publicAPIKeyIDKey, apiKey.ID)
			ctx = context.WithValue(ctx, publicIsSandboxKey, isSandbox)

			// Also set the standard org_id and app_id keys for compatibility with existing code
			ctx = context.WithValue(ctx, orgIDKey, apiKey.OrganizationID)
			ctx = context.WithValue(ctx, appIDKey, apiKey.ApplicationID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetPublicOrgID retrieves the organization ID from the public API context
func GetPublicOrgID(ctx context.Context) int {
	id, _ := ctx.Value(publicOrgIDKey).(int)
	return id
}

// GetPublicAppID retrieves the application ID from the public API context
func GetPublicAppID(ctx context.Context) int {
	id, _ := ctx.Value(publicAppIDKey).(int)
	return id
}

// GetPublicAPIKeyID retrieves the API key ID from the public API context
func GetPublicAPIKeyID(ctx context.Context) int {
	id, _ := ctx.Value(publicAPIKeyIDKey).(int)
	return id
}

// GetPublicIsSandbox retrieves the sandbox mode flag from the public API context
func GetPublicIsSandbox(ctx context.Context) bool {
	isSandbox, _ := ctx.Value(publicIsSandboxKey).(bool)
	return isSandbox
}
