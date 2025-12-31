package core

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type APIKeyService struct {
	store *store.Store
}

func NewAPIKeyService(store *store.Store) *APIKeyService {
	return &APIKeyService{store: store}
}

func (s *APIKeyService) CreateAPIKey(ctx context.Context, orgID, appID int, name string) (*model.APIKeyResponse, error) {
	// Generate Key
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	rawKey := "sk_live_" + hex.EncodeToString(bytes)

	// Hash Key
	hash, err := bcrypt.GenerateFromPassword([]byte(rawKey), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	apiKey := &model.APIKey{
		OrganizationID: orgID,
		ApplicationID:  appID,
		Name:           name,
		KeyHash:        string(hash),
		Prefix:         rawKey[:12] + "...",
	}

	if err := s.store.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, err
	}

	return &model.APIKeyResponse{
		APIKey: *apiKey,
		RawKey: rawKey,
	}, nil
}

func (s *APIKeyService) ListAPIKeys(ctx context.Context, appID int) ([]model.APIKey, error) {
	return s.store.GetAPIKeysByApplicationID(ctx, appID)
}

func (s *APIKeyService) RevokeAPIKey(ctx context.Context, keyID, orgID int) error {
	// Secure deletion ensuring the key belongs to the organization
	return s.store.DeleteAPIKey(ctx, keyID, orgID)
}
