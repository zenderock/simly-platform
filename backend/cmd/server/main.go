package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/zenderock/simly-backend/internal/config"
	"github.com/zenderock/simly-backend/internal/server"
)

func main() {
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

	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
