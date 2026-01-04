package api

import (
	"encoding/json"
	"net/http"

	"github.com/zenderock/simly-backend/internal/core"
)

type UploadHandler struct {
	storageService core.StorageService
}

func NewUploadHandler(storageService core.StorageService) *UploadHandler {
	return &UploadHandler{
		storageService: storageService,
	}
}

func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	// Limit upload size (e.g., 1MB)
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		RespondWithError(w, http.StatusBadRequest, "File too large or invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Missing file in request")
		return
	}
	defer file.Close()

	// Determine folder based on query param or context (optional)
	// For now, default to "uploads"
	folder := r.FormValue("folder")
	if folder == "" {
		folder = "uploads"
	}

	url, err := h.storageService.UploadFile(r.Context(), file, header, folder)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to upload file")
		return
	}

	response := map[string]string{
		"url": url,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
