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

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserExists         = errors.New("user already exists")
)

type UserService struct {
	store      *store.Store
	orgService *OrganizationService
	jwtSecret  string
}

func NewUserService(store *store.Store, orgService *OrganizationService, jwtSecret string) *UserService {
	return &UserService{
		store:      store,
		orgService: orgService,
		jwtSecret:  jwtSecret,
	}
}

func (s *UserService) Register(ctx context.Context, req model.CreateUserRequest) (*model.AuthResponse, error) {
	// Check if user already exists
	_, err := s.store.GetUserByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrUserExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &model.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
	}

	if err := s.store.CreateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *UserService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	// Get user by email
	user, err := s.store.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *UserService) generateToken(userID int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
