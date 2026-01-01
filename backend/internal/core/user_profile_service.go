package core

import (
	"context"
	"errors"
	"fmt"

	"github.com/zenderock/simly-backend/internal/model"
	"github.com/zenderock/simly-backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidPassword = errors.New("invalid current password")
	ErrEmailExists     = errors.New("email already exists")
)

type UserProfileService struct {
	store *store.Store
}

func NewUserProfileService(store *store.Store) *UserProfileService {
	return &UserProfileService{store: store}
}

func (s *UserProfileService) UpdateProfile(ctx context.Context, userID int, req model.UpdateProfileRequest) (*model.User, error) {
	// Check if email is already taken by another user
	if req.Email != "" {
		existingUser, err := s.store.GetUserByEmail(ctx, req.Email)
		if err == nil && existingUser.ID != userID {
			return nil, ErrEmailExists
		}
	}

	// Update user
	if err := s.store.UpdateUser(ctx, userID, req.Name, req.Email, req.AvatarURL); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Return updated user
	return s.store.GetUserByID(ctx, userID)
}

func (s *UserProfileService) ChangePassword(ctx context.Context, userID int, req model.ChangePasswordRequest) error {
	// Get current user
	user, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return ErrInvalidPassword
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	return s.store.UpdateUserPassword(ctx, userID, string(hashedPassword))
}

func (s *UserProfileService) GetProfile(ctx context.Context, userID int) (*model.User, error) {
	return s.store.GetUserByID(ctx, userID)
}
