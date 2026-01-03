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
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
