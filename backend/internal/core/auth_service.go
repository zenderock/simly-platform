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
	appService *ApplicationService
	jwtSecret  string
}

func NewUserService(store *store.Store, orgService *OrganizationService, appService *ApplicationService, jwtSecret string) *UserService {
	return &UserService{
		store:      store,
		orgService: orgService,
		appService: appService,
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

	// Use Transaction for atomic creation of User -> Org -> App
	err = s.store.ExecTx(ctx, func(txStore *store.Store) error {
		// 1. Create User
		if err := txStore.CreateUser(ctx, user); err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}

		// 2. Create Default Organization
		orgName := fmt.Sprintf("%s's Org", user.Name)

		// Generate explicit unique slug: "org-{user_id}-{random}"
		slug := fmt.Sprintf("org-%d-%d", user.ID, time.Now().UnixNano()%10000)

		// Create scoped services
		txOrgService := s.orgService.WithStore(txStore)
		txAppService := s.appService.WithStore(txStore)

		org, err := txOrgService.CreateOrganization(ctx, user.ID, orgName, slug, "owner")
		if err != nil {
			return fmt.Errorf("failed to create default organization: %w", err)
		}

		// 3. Create Default Application
		_, err = txAppService.CreateApplication(ctx, org.ID, model.CreateApplicationRequest{
			Name:      "Default App",
			IsSandbox: false,
		})
		if err != nil {
			return fmt.Errorf("failed to create default application: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
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
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
