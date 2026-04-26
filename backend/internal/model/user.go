package model

import (
	"strings"
	"time"
)

type User struct {
	ID                     int        `json:"id"`
	Email                  string     `json:"email"`
	PasswordHash           string     `json:"-"` // Never return password hash in JSON
	Name                   string     `json:"name"`
	AvatarURL              string     `json:"avatar_url"`
	PasswordResetToken     *string    `json:"-"`
	PasswordResetExpiresAt *time.Time `json:"-"`
	IsPlatformAdmin        bool       `json:"is_platform_admin"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type CreateUserRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	Name           string `json:"name"`
	TurnstileToken string `json:"turnstile_token"`
}

type LoginRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	TurnstileToken string `json:"turnstile_token"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token         string         `json:"token"`
	User          User           `json:"user"`
	Organizations []Organization `json:"organizations"`
}
type UpdateProfileRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func IsPlatformAdminEmail(email string) bool {
	return strings.HasSuffix(strings.ToLower(strings.TrimSpace(email)), "@zenderock.me")
}
