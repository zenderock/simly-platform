package config

import (
	"errors"
	"os"

	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL            string
	Port                   string
	JWTSecret              string
	SandboxSuccessNumber   string
	SandboxFailureNumber   string
	ResendAPIKey           string
	ResendFromEmail        string
	StripeSecretKey        string
	StripePublishableKey   string
	StripeWebhookSecret    string
	BillingAdminSecret     string
	StripePricePro         string
	StripePriceAgency      string
	StripePriceWhiteLabel  string
	FirebaseServiceAccount string
	FrontendURL            string
	TurnstileSecret        string
	RedisURL               string
	R2AccountID            string
	R2AccessKeyID          string
	R2SecretAccessKey      string
	R2BucketName           string
	R2PublicURL            string
	OpenRouterAPIKey       string
	OpenRouterModel        string
}

func Load() *Config {
	// Best effort for local development. In production, environment variables
	// are often injected directly by the platform (e.g. Dokploy).
	_ = godotenv.Load()

	return &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/simly?sslmode=disable"),
		JWTSecret:              getEnv("JWT_SECRET", "super-secret-key"),
		SandboxSuccessNumber:   getEnv("SANDBOX_SUCCESS_NUMBER", "+15550000000"),
		SandboxFailureNumber:   getEnv("SANDBOX_FAILURE_NUMBER", "+15550000001"),
		ResendAPIKey:           getEnv("RESEND_API_KEY", ""),
		ResendFromEmail:        getEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
		StripeSecretKey:        getEnv("STRIPE_SECRET_KEY", ""),
		StripePublishableKey:   getEnv("STRIPE_PUBLISHABLE_KEY", ""),
		StripeWebhookSecret:    getEnv("STRIPE_WEBHOOK_SECRET", ""),
		BillingAdminSecret:     getEnv("BILLING_ADMIN_SECRET", ""),
		StripePricePro:         getEnv("STRIPE_PRICE_PRO", "price_pro_default"),
		StripePriceAgency:      getEnv("STRIPE_PRICE_AGENCY", "price_agency_default"),
		StripePriceWhiteLabel:  getEnv("STRIPE_PRICE_WHITE_LABEL", "price_white_label_default"),
		FirebaseServiceAccount: getEnv("FIREBASE_SERVICE_ACCOUNT", ""),
		FrontendURL:            getEnv("FRONTEND_URL", "http://localhost:3000"),
		TurnstileSecret:        getEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA"),
		RedisURL:               getEnv("REDIS_URL", ""),
		R2AccountID:            getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:          getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey:      getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2BucketName:           getEnv("R2_BUCKET_NAME", ""),
		R2PublicURL:            getEnv("R2_PUBLIC_URL", ""),
		OpenRouterAPIKey:       getEnv("OPENROUTER_API_KEY", ""),
		OpenRouterModel:        getEnv("OPENROUTER_MODEL", "openrouter/free"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func (c *Config) RedisConnOpt() (asynq.RedisConnOpt, error) {
	if c.RedisURL == "" {
		return nil, errors.New("REDIS_URL is required")
	}

	return asynq.ParseRedisURI(c.RedisURL)
}
