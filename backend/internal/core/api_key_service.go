package core

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"

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
func (s *APIKeyService) VerifyAPIKey(ctx context.Context, rawKey string) (*model.APIKey, error) {
	if len(rawKey) < 12 {
		return nil, errors.New("invalid key format") // or fmt.Errorf("invalid key format")
	}

	// 1. Extract Prefix
	prefix := rawKey[:12] + "..."

	// 2. Find Candidates
	candidates, err := s.store.GetAPIKeysByPrefix(ctx, prefix)
	if err != nil {
		return nil, err
	}

	// 3. Check Hash
	for _, k := range candidates {
		err := bcrypt.CompareHashAndPassword([]byte(k.KeyHash), []byte(rawKey))
		if err == nil {
			// Match found!
			// Update LastUsedAt asynchronously to not block the request
			go func(id int) {
				// Create a background context as the request context may be cancelled
				if err := s.store.UpdateAPIKeyLastUsed(context.Background(), id); err != nil {
					// Log error? For now silent failure is acceptable for metrics
				}
			}(k.ID)

			return &k, nil
		}
	}

	return nil, errors.New("invalid api key") // Key not found or mismatch
}
