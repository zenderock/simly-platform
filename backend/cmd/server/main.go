package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/zenderock/simly-backend/internal/api"
	"github.com/zenderock/simly-backend/internal/config"
	"github.com/zenderock/simly-backend/internal/core"
	"github.com/zenderock/simly-backend/internal/store"
)

func main() {
	fmt.Println("Simly Backend starting (Production Mode)...")

	// 1. Configuration
	cfg := config.Load()
	jwtSecret := []byte(cfg.JWTSecret)

	// 2. Database & Migrations
	db, err := store.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Critical: Database connection failed: %v", err)
	}
	defer db.Close()

	if err := store.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Printf("Migration warning: %v", err)
	}

	// 3. Dependency Injection
	notificationProvider := &core.LogNotificationProvider{}

	// Stores (Shared DB pool)
	// Services
	orgService := core.NewOrganizationService(db)
	appService := core.NewApplicationService(db)
	apiKeyService := core.NewAPIKeyService(db)
	webhookService := core.NewWebhookService(db)
	userService := core.NewUserService(db, orgService, string(jwtSecret))
	deviceService := core.NewDeviceService(db)
	rateLimitService := core.NewRateLimitService(db)
	auditService := core.NewAuditService(db)
	messageService := core.NewMessageService(db, webhookService, notificationProvider, rateLimitService, appService, cfg.SandboxSuccessNumber, cfg.SandboxFailureNumber)

	// Handlers
	authHandler := api.NewAuthHandler(userService)
	appHandler := api.NewApplicationHandler(appService, orgService, auditService)
	apiKeyHandler := api.NewAPIKeyHandler(apiKeyService, appService, orgService, auditService)
	deviceHandler := api.NewDeviceHandler(deviceService, orgService, auditService)
	messageHandler := api.NewMessageHandler(messageService, orgService)
	webhookHandler := api.NewWebhookHandler(webhookService, orgService, auditService)
	orgHandler := api.NewOrganizationHandler(orgService, auditService)

	// 4. Routing (Chi)
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Health Check
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Simly Gateway API v1.0 - Operating Normally"))
	})

	// Public Routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
	})

	// Protected Routes (SaaS core)
	r.Group(func(r chi.Router) {
		r.Use(api.AuthMiddleware(jwtSecret))

		// Application Management
		r.Route("/api/applications", func(r chi.Router) {
			r.Get("/", appHandler.ListApplications)
			r.Post("/", appHandler.CreateApplication)
			r.Delete("/{appID}", appHandler.DeleteApplication)
		})

		// API Keys
		r.Route("/api/api-keys", func(r chi.Router) {
			r.Get("/", apiKeyHandler.ListAPIKeys)
			r.Post("/", apiKeyHandler.CreateAPIKey)
			r.Delete("/{keyID}", apiKeyHandler.RevokeAPIKey)
		})

		// Device Management
		r.Route("/api/devices", func(r chi.Router) {
			r.Get("/", deviceHandler.ListDevices)
			r.Post("/", deviceHandler.RegisterDevice)
			r.Delete("/{deviceID}", deviceHandler.DeleteDevice)
			r.Post("/{deviceID}/heartbeat", deviceHandler.Heartbeat)
		})

		// Messaging
		r.Route("/api/messages", func(r chi.Router) {
			r.Get("/", messageHandler.ListMessages)
			r.Post("/send", messageHandler.SendSMS)
			r.Post("/inbound", messageHandler.InternalReceiveSMS)
		})

		// Webhooks
		r.Route("/api/webhooks", func(r chi.Router) {
			r.Get("/", webhookHandler.ListWebhooks)
			r.Post("/", webhookHandler.RegisterWebhook)
			r.Delete("/{webhookID}", webhookHandler.DeleteWebhook)
		})

		// Organization Management
		r.Route("/api/organization", func(r chi.Router) {
			r.Post("/members", orgHandler.AddMember)
			r.Delete("/members/{userID}", orgHandler.RemoveMember)
		})
	})

	// 5. Server Start
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Simly API ready on %s", addr)

	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
