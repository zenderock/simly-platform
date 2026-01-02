package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// Error codes for the Public API
const (
	ErrCodeInvalidRequest    = "invalid_request"
	ErrCodeMissingParameter  = "missing_parameter"
	ErrCodeInvalidAPIKey     = "invalid_api_key"
	ErrCodeInsufficientPerms = "insufficient_permissions"
	ErrCodeResourceNotFound  = "resource_not_found"
	ErrCodeRateLimitExceeded = "rate_limit_exceeded"
	ErrCodeInternalError     = "internal_error"
)

// APIErrorDetail contains the error details
type APIErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Param   string `json:"param,omitempty"`
}

// APIError is the standardized error response for the Public API
type APIError struct {
	Error APIErrorDetail `json:"error"`
}

// WriteError writes a standardized error response to the response writer
func WriteError(w http.ResponseWriter, statusCode int, code, message, param string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	apiErr := APIError{
		Error: APIErrorDetail{
			Code:    code,
			Message: message,
			Param:   param,
		},
	}
	json.NewEncoder(w).Encode(apiErr)
}

// ValidationError writes a 400 Bad Request error for validation failures
func ValidationError(w http.ResponseWriter, message, param string) {
	WriteError(w, http.StatusBadRequest, ErrCodeInvalidRequest, message, param)
}

// MissingParamError writes a 400 Bad Request error for missing required parameters
func MissingParamError(w http.ResponseWriter, param string) {
	WriteError(w, http.StatusBadRequest, ErrCodeMissingParameter, "Required parameter is missing: "+param, param)
}

// AuthError writes a 401 Unauthorized error for authentication failures
func AuthError(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Invalid or missing API key"
	}
	WriteError(w, http.StatusUnauthorized, ErrCodeInvalidAPIKey, message, "")
}

// ForbiddenError writes a 403 Forbidden error for permission failures
func ForbiddenError(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Insufficient permissions for this operation"
	}
	WriteError(w, http.StatusForbidden, ErrCodeInsufficientPerms, message, "")
}

// NotFoundError writes a 404 Not Found error
func NotFoundError(w http.ResponseWriter, resource string) {
	message := "The requested resource was not found"
	if resource != "" {
		message = resource + " not found"
	}
	WriteError(w, http.StatusNotFound, ErrCodeResourceNotFound, message, "")
}

// RateLimitError writes a 429 Too Many Requests error with Retry-After header
func RateLimitError(w http.ResponseWriter, retryAfterSeconds int) {
	w.Header().Set("Retry-After", strconv.Itoa(retryAfterSeconds))
	WriteError(w, http.StatusTooManyRequests, ErrCodeRateLimitExceeded, "Rate limit exceeded. Please retry after the specified time.", "")
}

// InternalError writes a 500 Internal Server Error
func InternalError(w http.ResponseWriter) {
	WriteError(w, http.StatusInternalServerError, ErrCodeInternalError, "An internal error occurred. Please try again later.", "")
}
