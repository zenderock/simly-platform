package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

// E.164 phone number regex: + followed by 1-15 digits
var e164Regex = regexp.MustCompile(`^\+[1-9]\d{1,14}$`)

// Maximum message body length
const maxMessageBodyLength = 1600

// PublicMessageHandler handles Public API message endpoints
type PublicMessageHandler struct {
	messageService *core.MessageService
	orgService     *core.OrganizationService
	appService     *core.ApplicationService
}

// NewPublicMessageHandler creates a new PublicMessageHandler
func NewPublicMessageHandler(
	messageService *core.MessageService,
	orgService *core.OrganizationService,
	appService *core.ApplicationService,
) *PublicMessageHandler {
	return &PublicMessageHandler{
		messageService: messageService,
		orgService:     orgService,
		appService:     appService,
	}
}

// PublicSendMessageRequest represents the request body for POST /v1/messages
type PublicSendMessageRequest struct {
	To   string `json:"to"`
	Body string `json:"body"`
}

// PublicMessageResponse represents the response for message operations
type PublicMessageResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	To        string `json:"to"`
	Body      string `json:"body"`
	CreatedAt string `json:"created_at"`
}

// SendMessage handles POST /v1/messages
// Sends an SMS message via the Public API
func (h *PublicMessageHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	// Get context values from auth middleware
	orgID := GetPublicOrgID(r.Context())
	appID := GetPublicAppID(r.Context())
	isSandbox := GetPublicIsSandbox(r.Context())

	if orgID == 0 || appID == 0 {
		AuthError(w, "Invalid authentication context")
		return
	}

	// Parse request body
	var req PublicSendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ValidationError(w, "Invalid JSON request body", "")
		return
	}

	// Validate required fields
	if req.To == "" {
		MissingParamError(w, "to")
		return
	}
	if req.Body == "" {
		MissingParamError(w, "body")
		return
	}

	// Validate E.164 phone number format
	if !e164Regex.MatchString(req.To) {
		ValidationError(w, "The 'to' field must be a valid E.164 phone number (e.g., +33612345678)", "to")
		return
	}

	// Validate message body length
	if len(req.Body) > maxMessageBodyLength {
		ValidationError(w, fmt.Sprintf("The 'body' field must not exceed %d characters", maxMessageBodyLength), "body")
		return
	}

	// If sandbox mode, verify the app is actually a sandbox app
	if isSandbox {
		app, err := h.appService.GetApplication(r.Context(), appID)
		if err != nil || !app.IsSandbox {
			// Key type doesn't match app type - this shouldn't happen normally
			// but we handle it gracefully
			ValidationError(w, "Test API key can only be used with sandbox applications", "")
			return
		}
	}

	// Create the send message request
	sendReq := model.SendMessageRequest{
		ApplicationID: &appID,
		To:            req.To,
		Body:          req.Body,
		Priority:      "normal",
	}

	// Send the message
	msg, err := h.messageService.SendSMS(r.Context(), orgID, sendReq)
	if err != nil {
		// Check for specific error types
		errMsg := err.Error()
		if errMsg == "no gateways configured" || errMsg == "no online devices available (or all candidates excluded)" {
			WriteError(w, http.StatusServiceUnavailable, "no_devices_available", "No devices are available to send the message. Please ensure at least one device is online.", "")
			return
		}
		InternalError(w)
		return
	}

	// Build response
	response := PublicMessageResponse{
		ID:        fmt.Sprintf("msg_%d", msg.ID),
		Status:    msg.Status,
		To:        msg.ToNumber,
		Body:      msg.Body,
		CreatedAt: msg.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetMessage handles GET /v1/messages/{id}
// Retrieves the status and details of a message
func (h *PublicMessageHandler) GetMessage(w http.ResponseWriter, r *http.Request) {
	// Get context values from auth middleware
	orgID := GetPublicOrgID(r.Context())

	if orgID == 0 {
		AuthError(w, "Invalid authentication context")
		return
	}

	// Extract message ID from URL
	idParam := chi.URLParam(r, "id")

	// Parse the message ID (handle both "msg_123" and "123" formats)
	var msgID int
	var err error

	if len(idParam) > 4 && idParam[:4] == "msg_" {
		msgID, err = strconv.Atoi(idParam[4:])
	} else {
		msgID, err = strconv.Atoi(idParam)
	}

	if err != nil {
		ValidationError(w, "Invalid message ID format", "id")
		return
	}

	// Get the message from the store
	msg, err := h.messageService.GetMessage(r.Context(), msgID)
	if err != nil {
		NotFoundError(w, "Message")
		return
	}

	// Verify the message belongs to the requesting organization
	if msg.OrganizationID != orgID {
		NotFoundError(w, "Message")
		return
	}

	// Build response
	response := PublicMessageResponse{
		ID:        fmt.Sprintf("msg_%d", msg.ID),
		Status:    msg.Status,
		To:        msg.ToNumber,
		Body:      msg.Body,
		CreatedAt: msg.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
