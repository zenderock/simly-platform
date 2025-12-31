package core

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	store      *store.Store
	orgService *OrganizationService
	jwtSecret  []byte
}

func NewUserService(store *store.Store, orgService *OrganizationService, jwtSecret string) *UserService {
	return &UserService{
		store:      store,
		orgService: orgService,
		jwtSecret:  []byte(jwtSecret),
	}
}

func (s *UserService) Register(ctx context.Context, req model.CreateUserRequest) (*model.User, error) {
	// Check if user exists
	if _, err := s.store.GetUserByEmail(ctx, req.Email); err == nil {
		return nil, errors.New("email already registered")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &model.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		AvatarURL:    "", // Default or Gravatar
	}

	// Transaction would be better here, but let's keep it simple for now or assume happy path
	// Ideally Store should expose transaction interface.
	// TODO: Implement Transaction support in Store.

	if err := s.store.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// Create Default Organization
	orgName := user.Name + "'s Team"
	if user.Name == "" {
		orgName = "My Organization"
	}
	orgSlug := fmt.Sprintf("org-%d", user.ID) // Simple slug strategy for now

	org, err := s.orgService.CreateOrganization(ctx, orgName, orgSlug)
	if err != nil {
		// Cleanup user? Or just fail?
		// For MVP, we log error and return. User exists but has no org.
		return nil, fmt.Errorf("failed to create default organization: %w", err)
	}

	// Add User as Owner
	if err := s.orgService.AddMember(ctx, org.ID, user.ID, "owner"); err != nil {
		return nil, fmt.Errorf("failed to add user to organization: %w", err)
	}

	return user, nil
}

func (s *UserService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.store.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Generate JWT
	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *UserService) generateToken(user *model.User) (string, error) {
	claims := jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}
