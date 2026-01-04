package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
)

type AIHandler struct {
	service    *core.AIService
	orgService *core.OrganizationService
}

func NewAIHandler(service *core.AIService, orgService *core.OrganizationService) *AIHandler {
	return &AIHandler{service: service, orgService: orgService}
}

type GeneratePrefixesRequest struct {
	Prompt string `json:"prompt"`
}

type GeneratePrefixesResponse struct {
	Prefixes string `json:"prefixes"`
}

func (h *AIHandler) GeneratePrefixes(w http.ResponseWriter, r *http.Request) {
	_, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		RespondWithError(w, http.StatusForbidden, "Organization required")
		return
	}

	var req GeneratePrefixesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Prompt == "" {
		RespondWithError(w, http.StatusBadRequest, "Prompt is required")
		return
	}

	prefixes, err := h.service.GeneratePrefixes(r.Context(), req.Prompt)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to generate prefixes: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, GeneratePrefixesResponse{Prefixes: prefixes})
}
