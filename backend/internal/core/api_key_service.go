package core

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type APIKeyService struct {
	store      *store.Store
	appService *ApplicationService
}

const apiKeyPrefixLength = 10

func NewAPIKeyService(store *store.Store) *APIKeyService {
	return &APIKeyService{store: store}
}

// SetApplicationService sets the application service for sandbox detection
// This is used to avoid circular dependencies during initialization
func (s *APIKeyService) SetApplicationService(appService *ApplicationService) {
	s.appService = appService
}

// CreateAPIKey creates a new API key for an application
// It generates sk_test_* for sandbox apps and sk_live_* for production apps
func (s *APIKeyService) CreateAPIKey(ctx context.Context, orgID, appID int, name string) (*model.APIKeyResponse, error) {
	// Determine key prefix based on application sandbox status
	keyPrefix := "sk_live_"

	if s.appService != nil {
		app, err := s.appService.GetApplication(ctx, appID)
		if err == nil && app.IsSandbox {
			keyPrefix = "sk_test_"
		}
	}

	// Generate Key
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	rawKey := keyPrefix + hex.EncodeToString(bytes)

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
		Prefix:         rawKey[:apiKeyPrefixLength],
	}

	if err := s.store.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, err
	}

	return &model.APIKeyResponse{
		APIKey: *apiKey,
		RawKey: rawKey,
	}, nil
}

// CreateAPIKeyWithSandbox creates a new API key with explicit sandbox flag
// This is useful when the sandbox status is already known
func (s *APIKeyService) CreateAPIKeyWithSandbox(ctx context.Context, orgID, appID int, name string, isSandbox bool) (*model.APIKeyResponse, error) {
	// Determine key prefix based on sandbox flag
	keyPrefix := "sk_live_"
	if isSandbox {
		keyPrefix = "sk_test_"
	}

	// Generate Key
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	rawKey := keyPrefix + hex.EncodeToString(bytes)

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
		Prefix:         rawKey[:apiKeyPrefixLength],
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

// APIKeyVerifyResult contains the result of API key verification
type APIKeyVerifyResult struct {
	APIKey    *model.APIKey
	IsSandbox bool
}

// VerifyAPIKey verifies an API key and returns the key details along with sandbox status
func (s *APIKeyService) VerifyAPIKey(ctx context.Context, rawKey string) (*model.APIKey, error) {
	if len(rawKey) < apiKeyPrefixLength {
		return nil, errors.New("invalid key format")
	}

	// 1. Extract Prefix
	prefix := rawKey[:apiKeyPrefixLength]

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

	return nil, errors.New("invalid api key")
}

// VerifyAPIKeyWithSandbox verifies an API key and returns both the key and sandbox status
func (s *APIKeyService) VerifyAPIKeyWithSandbox(ctx context.Context, rawKey string) (*APIKeyVerifyResult, error) {
	apiKey, err := s.VerifyAPIKey(ctx, rawKey)
	if err != nil {
		return nil, err
	}

	// Determine sandbox status from the key prefix
	isSandbox := strings.HasPrefix(rawKey, "sk_test_")

	return &APIKeyVerifyResult{
		APIKey:    apiKey,
		IsSandbox: isSandbox,
	}, nil
}

// IsSandboxKey checks if a raw key is a sandbox (test) key based on its prefix
func IsSandboxKey(rawKey string) bool {
	return strings.HasPrefix(rawKey, "sk_test_")
}

// IsLiveKey checks if a raw key is a live (production) key based on its prefix
func IsLiveKey(rawKey string) bool {
	return strings.HasPrefix(rawKey, "sk_live_")
}
