package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/model"
)

type ContactHandler struct {
	service    *core.ContactService
	orgService *core.OrganizationService
}

func NewContactHandler(service *core.ContactService, orgService *core.OrganizationService) *ContactHandler {
	return &ContactHandler{service: service, orgService: orgService}
}

// Contacts

func (h *ContactHandler) ListContacts(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}
	appID := GetActiveAppID(r)

	contacts, err := h.service.ListContacts(r.Context(), orgID, appID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(contacts)
}

func (h *ContactHandler) CreateContact(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}
	appID := GetActiveAppID(r)

	var req model.CreateContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Force AppID from context
	if appID != 0 {
		req.ApplicationID = appID
	}

	contact, err := h.service.CreateContact(r.Context(), orgID, req)
	if err != nil {
		if errors.Is(err, core.ErrLimitExceeded) {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(contact)
}

func (h *ContactHandler) UpdateContact(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Contact ID", http.StatusBadRequest)
		return
	}

	var req model.CreateContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	contact, err := h.service.UpdateContact(r.Context(), id, orgID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(contact)
}

func (h *ContactHandler) DeleteContact(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Contact ID", http.StatusBadRequest)
		return
	}

	if err := h.service.DeleteContact(r.Context(), id, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Lists

func (h *ContactHandler) ListLists(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}
	appID := GetActiveAppID(r)

	lists, err := h.service.ListContactLists(r.Context(), orgID, appID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lists)
}

func (h *ContactHandler) CreateList(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}
	appID := GetActiveAppID(r)

	var req model.CreateContactListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if appID != 0 {
		req.ApplicationID = appID
	}

	list, err := h.service.CreateContactList(r.Context(), orgID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(list)
}

func (h *ContactHandler) GetList(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid List ID", http.StatusBadRequest)
		return
	}

	list, members, err := h.service.GetListDetails(r.Context(), id, orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := map[string]interface{}{
		"list":    list,
		"members": members,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *ContactHandler) DeleteList(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid List ID", http.StatusBadRequest)
		return
	}

	if err := h.service.DeleteContactList(r.Context(), id, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ContactHandler) ManageListMembers(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	listID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid List ID", http.StatusBadRequest)
		return
	}

	var req model.AddContactToListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Action: Add
	if err := h.service.AddContactsToList(r.Context(), listID, orgID, req.ContactIDs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *ContactHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	listID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid List ID", http.StatusBadRequest)
		return
	}

	memberIDStr := chi.URLParam(r, "memberID")
	memberID, err := strconv.Atoi(memberIDStr)
	if err != nil {
		http.Error(w, "Invalid Member ID", http.StatusBadRequest)
		return
	}

	if err := h.service.RemoveContactFromList(r.Context(), listID, memberID, orgID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
func (h *ContactHandler) ImportContacts(w http.ResponseWriter, r *http.Request) {
	orgID, err := GetActiveOrgID(r, h.orgService)
	if err != nil {
		http.Error(w, "Organization required", http.StatusForbidden)
		return
	}
	appID := GetActiveAppID(r)

	// Max 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	var listIDPtr *int
	listIDStr := r.FormValue("list_id")
	if listIDStr != "" {
		id, err := strconv.Atoi(listIDStr)
		if err == nil {
			listIDPtr = &id
		}
	}

	count, err := h.service.ImportContacts(r.Context(), orgID, appID, listIDPtr, file)
	if err != nil {
		if errors.Is(err, core.ErrLimitExceeded) {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Import successful",
		"count":   count,
	})
}
