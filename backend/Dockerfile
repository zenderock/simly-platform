# Build Stage
FROM golang:1.25.5-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy dependencies first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
# CGO_ENABLED=0 creates a static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o simly-backend ./cmd/server/main.go

# Runtime Stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies (certificates for HTTPS calls to Neon/Resend/Stripe)
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/simly-backend .

# Copy migrations for auto-migration startup
COPY --from=builder /app/migrations ./migrations

# Copy firebase config if generic name, otherwise user must mount it
# Assuming standard config/firebase-service-account.json or similar if inside project
# But typically sensitive files are mounted. For now, we assume environment variables 
# or mounted volumes for secrets.

# Expose port (internal container port)
EXPOSE 8080

# Run the binary
CMD ["./simly-backend"]
