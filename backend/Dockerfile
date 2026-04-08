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
RUN apk add --no-cache ca-certificates tzdata postgresql-client

# Copy binary from builder
COPY --from=builder /app/simly-backend .

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh .

# Copy migrations for auto-migration startup
COPY --from=builder /app/migrations ./migrations

# Copy Firebase service account file
COPY --from=builder /app/*.json ./

# Copy Neon one-time migration dump (imported once on first deploy)
COPY neon_backup.dump ./neon_backup.dump

RUN chmod +x /app/docker-entrypoint.sh

# Expose port (internal container port)
EXPOSE 8080

# Run database preflight, then start the binary
ENTRYPOINT ["./docker-entrypoint.sh"]
