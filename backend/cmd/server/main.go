package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zenderock/simly-backend/internal/config"
	"github.com/zenderock/simly-backend/internal/server"
)

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "prepare-db":
			cfg := config.Load()
			if err := server.PrepareDatabase(cfg); err != nil {
				log.Fatalf("Database preparation failed: %v", err)
			}
			return
		default:
			log.Fatalf("unknown command: %s", os.Args[1])
		}
	}

	fmt.Println("Simly Backend starting (Production Mode)...")

	// 1. Configuration
	cfg := config.Load()

	// 2. Initialize Server
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("Server initialization failed: %v", err)
	}
	defer srv.Close()

	// 3. Start Listener
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Simly API ready on %s", addr)

	httpServer := &http.Server{
		Addr:         addr,
		Handler:      srv.Router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 4. Setup graceful shutdown
	// Create a channel to listen for interrupt signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// Start HTTP server in a goroutine
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-quit
	log.Println("Shutting down server gracefully...")

	// Create a context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown HTTP server
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}

	// srv.Close() will be called by defer, which stops the dispatcher
	log.Println("Server stopped")
}
