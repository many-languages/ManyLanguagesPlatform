.PHONY: certs dev-https dev-http prod stop logs clean

# Base compose file
COMPOSE=docker compose -f docker-compose.yml

# Default target
help:
	@echo "Usage:"
	@echo "  make dev-http     Run JATOS locally with HTTP"
	@echo "  make dev-https    Run JATOS locally with HTTPS (mkcert)"
	@echo "  make prod         Run JATOS in production (Let's Encrypt)"
	@echo "  make stop         Stop containers"
	@echo "  make logs         Tail logs"
	@echo "  make clean        Remove containers and volumes"

dev-http:
	$(COMPOSE) -f docker-compose.override.http.yml up -d

dev-https: certs
	$(COMPOSE) -f docker-compose.override.https.yml up -d

certs: certs/jatos.localhost.pem certs/jatos.localhost-key.pem

certs/jatos.localhost.pem certs/jatos.localhost-key.pem:
	./scripts/gen-certs.sh

prod:
	$(COMPOSE) up -d

stop:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

clean:
	$(COMPOSE) down -v
