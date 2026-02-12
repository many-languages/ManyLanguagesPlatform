.PHONY: dev dev-https prod stop logs clean build up down validate-token help prune prune-all certs

# Use bash for better shell features
SHELL := /bin/bash

# Base compose files and commands
COMPOSE_BASE=docker compose -f docker-compose.yml
COMPOSE_DEV=$(COMPOSE_BASE)
COMPOSE_DEV_HTTPS=$(COMPOSE_BASE) -f docker-compose.override.https.yml
COMPOSE_PROD=$(COMPOSE_BASE) -f docker-compose.prod.yml

# Optional mail services
EMAIL_ENABLED ?= false
ifeq ($(EMAIL_ENABLED),true)
MAIL_PROFILE_FLAG=--profile mail
else
MAIL_PROFILE_FLAG=
endif

# Default target
help:
	@echo "Usage:"
	@echo "  make dev           Run entire stack (JATOS + Blitz app) in development mode (HTTP)"
	@echo "  make dev-https     Run entire stack in development mode with HTTPS (mkcert)"
	@echo "  make prod          Run entire stack in production mode"
	@echo "  make stop          Stop containers"
	@echo "  make logs          Tail logs"
	@echo "  make clean         Remove containers and volumes (⚠️  data loss!)"
	@echo "  make build         Build application containers"
	@echo "  make validate-token Validate JATOS token (requires JATOS_TOKEN in .env)"
	@echo "  make certs          Generate SSL certificates for HTTPS (requires mkcert)"
	@echo ""
	@echo "Environment toggles:"
	@echo "  EMAIL_ENABLED=true make dev    Enable Mailhog + SMTP during dev"
	@echo ""
	@echo "For more information, see DEPLOYMENT.md"

# Development mode
dev:
	@echo "🚀 Starting development environment..."
	@if [ ! -f .env ]; then \
		echo "⚠️  .env file not found. Creating from template..."; \
		cp .env.example .env 2>/dev/null || echo "Please create .env file manually. See .env.example for reference."; \
	fi
	@echo "📦 Starting Docker services..."
	$(COMPOSE_DEV) $(MAIL_PROFILE_FLAG) up -d
	@echo ""
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo ""
	@echo "✅ Services are starting!"
	@echo ""
	@echo "📋 Service URLs:"
	@echo "   - Blitz app: http://localhost:3000"
	@echo "   - JATOS: http://jatos.localhost (or http://localhost)"
	@echo ""
	@echo "🔑 JATOS Token Setup (Required):"
	@echo ""
	@echo "   1. Wait for JATOS to be ready (30-60 seconds)"
	@echo "      Check logs: make logs"
	@echo ""
	@echo "   2. Open JATOS UI in your browser:"
	@echo "      http://jatos.localhost"
	@echo "      (or http://localhost if JATOS_DOMAIN is set differently)"
	@echo ""
	@echo "   3. Login with default credentials:"
	@echo "      Username: admin"
	@echo "      Password: admin"
	@echo ""
	@echo "   4. Navigate to your user profile:"
	@echo "      Click your username in the top-right corner"
	@echo ""
	@echo "   5. Go to 'My API tokens' or 'API Tokens'"
	@echo ""
	@echo "   6. Click 'New Token' or 'Create Token'"
	@echo ""
	@echo "   7. Provide a name (e.g., 'docker-token') and set expiration"
	@echo ""
	@echo "   8. Click 'Generate' and copy the token"
	@echo "      ⚠️  The token will only be shown once!"
	@echo ""
	@echo "   9. Add the token to your .env file:"
	@echo "      JATOS_TOKEN=your-token-here"
	@echo ""
	@echo "  10. Restart the services:"
	@echo "      make stop"
	@echo "      make dev"
	@echo ""
	@echo "  11. Validate the token:"
	@echo "      make validate-token"
	@echo ""
	@echo "📊 To view logs:"
	@echo "   make logs"
	@echo ""
	@echo "🛑 To stop:"
	@echo "   make stop"
	@echo ""
	@echo "📖 For more information, see DEPLOYMENT.md"
	@echo ""

# Development mode with HTTPS
dev-https: certs
	@echo "🚀 Starting development environment with HTTPS..."
	@if [ ! -f .env ]; then \
		echo "⚠️  .env file not found. Creating from template..."; \
		cp .env.example .env 2>/dev/null || echo "Please create .env file manually. See .env.example for reference."; \
	fi
	@echo "📦 Starting Docker services with HTTPS..."
	$(COMPOSE_DEV_HTTPS) $(MAIL_PROFILE_FLAG) up -d
	@echo ""
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo ""
	@echo "✅ Services are starting!"
	@echo ""
	@echo "📋 Service URLs (HTTPS):"
	@echo "   - Blitz app: https://app.localhost"
	@echo "   - JATOS: https://jatos.localhost"
	@echo ""
	@echo "⚠️  Note: You may need to accept the self-signed certificate in your browser"
	@echo "   (mkcert certificates are trusted locally)"
	@echo ""
	@echo "🔑 JATOS Token Setup (Required):"
	@echo ""
	@echo "   1. Wait for JATOS to be ready (30-60 seconds)"
	@echo "      Check logs: make logs"
	@echo ""
	@echo "   2. Open JATOS UI in your browser:"
	@echo "      https://jatos.localhost"
	@echo "      (Accept the certificate warning if prompted)"
	@echo ""
	@echo "   3. Login with default credentials:"
	@echo "      Username: admin"
	@echo "      Password: admin"
	@echo ""
	@echo "   4. Navigate to your user profile:"
	@echo "      Click your username in the top-right corner"
	@echo ""
	@echo "   5. Go to 'My API tokens' or 'API Tokens'"
	@echo ""
	@echo "   6. Click 'New Token' or 'Create Token'"
	@echo ""
	@echo "   7. Provide a name (e.g., 'docker-token') and set expiration"
	@echo ""
	@echo "   8. Click 'Generate' and copy the token"
	@echo "      ⚠️  The token will only be shown once!"
	@echo ""
	@echo "   9. Add the token to your .env file:"
	@echo "      JATOS_TOKEN=your-token-here"
	@echo ""
	@echo "  10. Update NEXT_PUBLIC_JATOS_BASE in .env:"
	@echo "      NEXT_PUBLIC_JATOS_BASE=https://jatos.localhost"
	@echo ""
	@echo "  11. Restart the services:"
	@echo "      make stop"
	@echo "      make dev-https"
	@echo ""
	@echo "  12. Validate the token:"
	@echo "      make validate-token"
	@echo ""
	@echo "📊 To view logs:"
	@echo "   make logs"
	@echo ""
	@echo "🛑 To stop:"
	@echo "   make stop"
	@echo ""
	@echo "📖 For more information, see DEPLOYMENT.md"
	@echo ""

# Generate SSL certificates
certs: certs/localhost.pem certs/localhost-key.pem

certs/localhost.pem certs/localhost-key.pem:
	@echo "🔑 Generating SSL certificates..."
	@./scripts/gen-certs.sh

# Production mode
prod:
	@echo "🚀 Starting production environment..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Please create it from .env.example"; \
		exit 1; \
	fi
	@if [ -z "$$JATOS_TOKEN" ]; then \
		echo "⚠️  Warning: JATOS_TOKEN not set in .env file"; \
		echo "   The app will not be able to communicate with JATOS until token is set."; \
		echo "   See DEPLOYMENT.md for instructions."; \
	fi
	@echo "📦 Building and starting Docker services..."
	$(COMPOSE_PROD) up -d --build
	@echo ""
	@echo "⏳ Waiting for services to be ready..."
	@sleep 15
	@echo ""
	@echo "✅ Services are running in production mode!"
	@echo ""
	@echo "📋 Service URLs:"
	@echo "   - Blitz app: http://localhost:3000"
	@echo "   - JATOS: https://$$(grep JATOS_DOMAIN .env | cut -d '=' -f2 || echo 'jatos.localhost')"
	@echo ""

# Stop containers
stop:
	@echo "🛑 Stopping containers..."
	$(COMPOSE_BASE) down
	@echo "✅ Containers stopped"

# View logs
logs:
	@echo "📊 Showing logs (Ctrl+C to exit)..."
	$(COMPOSE_BASE) logs -f

# Clean (remove containers and volumes)
clean:
	@echo "⚠️  WARNING: This will remove all containers and volumes!"
	@echo "   All data will be lost!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(COMPOSE_BASE) down -v; \
		echo "✅ All containers and volumes removed!"; \
	else \
		echo "❌ Clean cancelled"; \
	fi

# Build containers
build:
	@echo "🔨 Building containers..."
	$(COMPOSE_BASE) build
	@echo "✅ Build complete"

# Start services (without initial setup)
up:
	$(COMPOSE_BASE) up -d

# Stop and remove containers (keep volumes)
down:
	$(COMPOSE_BASE) down

# Validate JATOS token
validate-token:
	@echo "🔍 Validating JATOS token..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found"; \
		exit 1; \
	fi
	@if ! grep -q "^JATOS_TOKEN=" .env || grep -q "^JATOS_TOKEN=$$" .env || grep -q "^JATOS_TOKEN=\"\"" .env; then \
		echo "❌ JATOS_TOKEN not set in .env file"; \
		echo ""; \
		echo "Please add JATOS_TOKEN to your .env file."; \
		echo "See DEPLOYMENT.md for instructions on creating a token."; \
		exit 1; \
	fi
	@echo "✅ JATOS_TOKEN found in .env file, validating..."
	@JATOS_TOKEN=$$(grep "^JATOS_TOKEN=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	export JATOS_TOKEN; \
	$(COMPOSE_BASE) --profile validation run --rm -e JATOS_TOKEN="$$JATOS_TOKEN" jatos-token-validator

# Prune unused Docker resources (safe - doesn't remove volumes)
prune:
	@echo "🧹 Pruning unused Docker resources..."
	@echo "   (This will remove stopped containers, unused images, and build cache)"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -f; \
		echo "✅ Prune complete"; \
	else \
		echo "❌ Prune cancelled"; \
	fi

# Prune everything including unused volumes (more aggressive)
prune-all:
	@echo "⚠️  WARNING: This will remove ALL unused Docker resources including volumes!"
	@echo "   (This does NOT affect your project's data volumes)"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -a --volumes -f; \
		echo "✅ Full prune complete"; \
	else \
		echo "❌ Prune cancelled"; \
	fi
