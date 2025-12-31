package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL          string
	Port                 string
	JWTSecret            string
	SandboxSuccessNumber string
	SandboxFailureNumber string
}

func Load() *Config {
	// Attempt to load .env, but don't fail if it doesn't exist (e.g., production)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error reading it")
	}

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/simly?sslmode=disable"),
		JWTSecret:            getEnv("JWT_SECRET", "super-secret-key"),
		SandboxSuccessNumber: getEnv("SANDBOX_SUCCESS_NUMBER", "+15550000000"),
		SandboxFailureNumber: getEnv("SANDBOX_FAILURE_NUMBER", "+15550000001"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
