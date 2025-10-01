# Default env files
ENV_FILE=.env
ENV_FILE_LOCAL=.env.local

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
	$(COMPOSE) -f docker-compose.override.http.yml --env-file $(ENV_FILE_LOCAL) up -d

dev-https: certs
	$(COMPOSE) -f docker-compose.override.https.yml --env-file $(ENV_FILE_LOCAL) up -d

certs:
	@./scripts/gen-certs.sh

prod:
	$(COMPOSE) --env-file $(ENV_FILE) up -d

stop:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

clean:
	$(COMPOSE) down -v
