package api

import (
	"bytes"
	"context"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

// responseRecorder wraps http.ResponseWriter to capture the response
type responseRecorder struct {
	http.ResponseWriter
	statusCode  int
	body        *bytes.Buffer
	wroteHeader bool
}

func newResponseRecorder(w http.ResponseWriter) *responseRecorder {
	return &responseRecorder{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
		body:           &bytes.Buffer{},
	}
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	if !r.wroteHeader {
		r.statusCode = statusCode
		r.wroteHeader = true
		r.ResponseWriter.WriteHeader(statusCode)
	}
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

// RequestLoggerMiddleware creates a middleware that logs all API requests asynchronously.
// It captures: method, path, status, duration, request/response bodies.
// Logs are stored asynchronously to not block requests.
func RequestLoggerMiddleware(logService *core.RequestLogService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			startTime := time.Now()

			// Read and restore request body
			var requestBody string
			if r.Body != nil {
				bodyBytes, err := io.ReadAll(r.Body)
				if err == nil {
					requestBody = string(bodyBytes)
					// Restore the body for downstream handlers
					r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
				}
			}

			// Truncate request body if too large (max 10KB)
			if len(requestBody) > 10240 {
				requestBody = requestBody[:10240] + "...[truncated]"
			}

			// Wrap response writer to capture response
			recorder := newResponseRecorder(w)

			// Process the request
			next.ServeHTTP(recorder, r)

			// Calculate duration
			duration := time.Since(startTime)

			// Get response body (truncate if too large)
			responseBody := recorder.body.String()
			if len(responseBody) > 10240 {
				responseBody = responseBody[:10240] + "...[truncated]"
			}

			// Extract context values set by PublicAPIAuthMiddleware
			orgID := GetPublicOrgID(r.Context())
			appID := GetPublicAppID(r.Context())
			apiKeyID := GetPublicAPIKeyID(r.Context())

			// Only log if we have valid context (authenticated request)
			if orgID == 0 || appID == 0 || apiKeyID == 0 {
				return
			}

			// Get client IP address
			ipAddress := getClientIP(r)

			// Create log entry
			logEntry := &model.RequestLog{
				OrganizationID: orgID,
				ApplicationID:  appID,
				APIKeyID:       apiKeyID,
				Method:         r.Method,
				Path:           r.URL.Path,
				StatusCode:     recorder.statusCode,
				Duration:       int(duration.Milliseconds()),
				RequestBody:    requestBody,
				ResponseBody:   responseBody,
				IPAddress:      ipAddress,
				UserAgent:      r.UserAgent(),
			}

			// Store log asynchronously to not block the response
			go func(entry *model.RequestLog) {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()

				if err := logService.CreateLog(ctx, entry); err != nil {
					log.Printf("Failed to create request log: %v", err)
				}
			}(logEntry)
		})
	}
}

// getClientIP extracts the client IP address from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxied requests)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		for i := 0; i < len(xff); i++ {
			if xff[i] == ',' {
				return xff[:i]
			}
		}
		return xff
	}

	// Check X-Real-IP header
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}
