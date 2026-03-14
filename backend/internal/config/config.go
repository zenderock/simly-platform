package config

import (
	"log"
	"os"

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
	StripePricePro         string
	StripePriceAgency      string
	FirebaseServiceAccount string
	FrontendURL            string
	TurnstileSecret        string
	RedisAddr              string
	RedisPassword          string
	R2AccountID            string
	R2AccessKeyID          string
	R2SecretAccessKey      string
	R2BucketName           string
	R2PublicURL            string
	OpenRouterAPIKey       string
	OpenRouterModel        string
}

func Load() *Config {
	// Attempt to load .env, but don't fail if it doesn't exist (e.g., production)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error reading it")
	}

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
		StripePricePro:         getEnv("STRIPE_PRICE_PRO", "price_pro_default"),
		StripePriceAgency:      getEnv("STRIPE_PRICE_AGENCY", "price_agency_default"),
		FirebaseServiceAccount: getEnv("FIREBASE_SERVICE_ACCOUNT", ""),
		FrontendURL:            getEnv("FRONTEND_URL", "http://localhost:3000"),
		TurnstileSecret:        getEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA"),
		RedisAddr:              getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:          getEnv("REDIS_PASSWORD", ""),
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
