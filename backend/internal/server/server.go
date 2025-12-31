package server

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

type Server struct {
	Config *config.Config
	DB     *store.Store
	Router chi.Router
}

func New(cfg *config.Config) (*Server, error) {
	// Database & Migrations
	db, err := store.New(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	if err := store.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Printf("Migration warning: %v", err)
	}

	s := &Server{
		Config: cfg,
		DB:     db,
		Router: chi.NewRouter(),
	}

	s.setupRoutes()
	return s, nil
}

func (s *Server) Close() {
	s.DB.Close()
}

func (s *Server) setupRoutes() {
	jwtSecret := []byte(s.Config.JWTSecret)

	// Dependency Injection
	notificationProvider := &core.LogNotificationProvider{}

	orgService := core.NewOrganizationService(s.DB)
	appService := core.NewApplicationService(s.DB)
	apiKeyService := core.NewAPIKeyService(s.DB)
	webhookService := core.NewWebhookService(s.DB)
	userService := core.NewUserService(s.DB, orgService, string(jwtSecret))
	deviceService := core.NewDeviceService(s.DB)
	rateLimitService := core.NewRateLimitService(s.DB)
	auditService := core.NewAuditService(s.DB)
	messageService := core.NewMessageService(s.DB, webhookService, notificationProvider, rateLimitService, appService, s.Config.SandboxSuccessNumber, s.Config.SandboxFailureNumber)

	// Handlers
	authHandler := api.NewAuthHandler(userService)
	appHandler := api.NewApplicationHandler(appService, orgService, auditService)
	apiKeyHandler := api.NewAPIKeyHandler(apiKeyService, appService, orgService, auditService)
	deviceHandler := api.NewDeviceHandler(deviceService, orgService, auditService)
	messageHandler := api.NewMessageHandler(messageService, orgService)
	webhookHandler := api.NewWebhookHandler(webhookService, orgService, auditService)
	orgHandler := api.NewOrganizationHandler(orgService, auditService)

	// Routing
	r := s.Router

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
}
