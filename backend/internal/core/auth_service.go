package core

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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
	store         *store.Store
	orgService    *OrganizationService
	appService    *ApplicationService
	emailProvider EmailProvider
	jwtSecret     string
	frontendURL   string
}

func NewUserService(store *store.Store, orgService *OrganizationService, appService *ApplicationService, emailProvider EmailProvider, jwtSecret string, frontendURL string) *UserService {
	return &UserService{
		store:         store,
		orgService:    orgService,
		appService:    appService,
		emailProvider: emailProvider,
		jwtSecret:     jwtSecret,
		frontendURL:   frontendURL,
	}
}

func (s *UserService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		// We return nil to avoid email enumeration attacks
		return nil
	}

	// Generate secure token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	token := hex.EncodeToString(b)
	expiry := time.Now().Add(1 * time.Hour)

	if err := s.store.SetUserResetToken(ctx, user.ID, token, expiry); err != nil {
		return err
	}

	// Send email
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.frontendURL, token)
	subject := "Reset your Simly password"
	htmlContent := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h1 style="color: #7c3aed; margin: 0; font-size: 28px;">Simly</h1>
			</div>
			<div style="color: #1e293b; line-height: 1.6;">
				<h2 style="font-size: 20px; margin-top: 0;">Reset your password</h2>
				<p>Hi %s,</p>
				<p>You requested a password reset for your Simly account. Click the button below to choose a new password:</p>
				<div style="text-align: center; margin: 35px 0;">
					<a href="%s" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset my password</a>
				</div>
				<p style="font-size: 14px; color: #64748b;">This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.</p>
				<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
				<p style="font-size: 12px; color: #94a3b8; text-align: center;">Simly Platform &bull; Simplified SMS Messaging</p>
			</div>
		</div>
	`, user.Name, resetURL)

	return s.emailProvider.SendEmail(ctx, email, subject, htmlContent)
}

func (s *UserService) ResetPassword(ctx context.Context, token string, newPassword string) error {
	user, err := s.store.GetUserByResetToken(ctx, token)
	if err != nil {
		return err
	}

	// Check expiry
	if user.PasswordResetExpiresAt != nil && user.PasswordResetExpiresAt.Before(time.Now()) {
		return errors.New("the reset link has expired")
	}


	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Start transactions
	return s.store.ExecTx(ctx, func(txStore *store.Store) error {
		if err := txStore.UpdateUserPassword(ctx, user.ID, string(hashedPassword)); err != nil {
			return err
		}
		return txStore.ClearUserResetToken(ctx, user.ID)
	})
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

	var createdOrg *model.Organization

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
		createdOrg = org

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
		Token:         token,
		User:          *user,
		Organizations: []model.Organization{*createdOrg},
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

	// Fetch user organizations
	orgs, err := s.orgService.GetUserOrganizations(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user organizations: %w", err)
	}

	return &model.AuthResponse{
		Token:         token,
		User:          *user,
		Organizations: orgs,
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
