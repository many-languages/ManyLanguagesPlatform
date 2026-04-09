# ManyLanguages Platform — deployment convenience targets
#
# These targets wrap deploy/scripts/*.sh — they are convenience only.
# The canonical deployment system lives in deploy/compose/.
# See deploy/README.md for full documentation.

.PHONY: help \
	dev-jatos-only dev-jatos-only-https \
	dev-host-app dev-host-app-https \
	dev-fullstack dev-fullstack-https \
	prod-up prod-up-letsencrypt \
	jatos-conf-dev-jatos-only jatos-conf-dev-host-app \
	jatos-conf-dev-fullstack jatos-conf-prod \
	down logs ps restart clean build \
	certs validate-token validate-setup prune prune-all

SHELL := /bin/bash

SCRIPTS := deploy/scripts
MODE_FILE := deploy/.active-mode
JATOS_CONF_SCRIPT := scripts/render-jatos-conf.sh

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

help:
	@echo ""
	@echo "  Deployment modes"
	@echo "  ────────────────────────────────────────────────────────────────"
	@echo "  make dev-jatos-only          JATOS + MySQL + Traefik (HTTP)"
	@echo "  make dev-jatos-only-https    same with local mkcert HTTPS"
	@echo "  make dev-host-app            Postgres + JATOS + Traefik; app on host"
	@echo "  make dev-host-app-https      same with local mkcert HTTPS"
	@echo "  make dev-fullstack           Everything in Docker (HTTP)"
	@echo "  make dev-fullstack-https     Everything in Docker (HTTPS)"
	@echo "  make prod-up                 Production (TLS handled externally)"
	@echo "  make prod-up-letsencrypt     Production + automatic Let's Encrypt"
	@echo ""
	@echo "  Operations (uses the last-started mode)"
	@echo "  ────────────────────────────────────────────────────────────────"
	@echo "  make down                    Stop the active mode"
	@echo "  make logs                    Tail logs"
	@echo "  make ps                      List running containers"
	@echo "  make restart                 down + up the active mode"
	@echo "  make build                   Build app image for active mode"
	@echo "  make clean                   Stop + remove volumes (data loss!)"
	@echo ""
	@echo "  Utilities"
	@echo "  ────────────────────────────────────────────────────────────────"
	@echo "  make certs                   Generate mkcert certificates"
	@echo "  make validate-token          Validate JATOS token (host-based)"
	@echo "  make validate-setup          Validate full setup"
	@echo "  make prune                   Prune unused Docker resources"
	@echo ""
	@echo "  Flags (pass via environment):"
	@echo "    MAIL=1 make dev-jatos-only       include Mailhog"
	@echo "    MAIL=1 make dev-host-app         include Mailhog"
	@echo "    MAIL=1 make dev-fullstack        include Mailhog"
	@echo "    CRON=1 make dev-fullstack        include study-status cron"
	@echo "    MAIL=1 CRON=1 make dev-fullstack both"
	@echo ""
	@echo "  Full docs: deploy/README.md"
	@echo ""

# ---------------------------------------------------------------------------
# Internal: build script flags from env vars
# ---------------------------------------------------------------------------

SCRIPT_FLAGS :=
ifdef MAIL
SCRIPT_FLAGS += --mail
endif
ifdef CRON
SCRIPT_FLAGS += --cron
endif

# ---------------------------------------------------------------------------
# Internal: render JATOS config from mode env
# ---------------------------------------------------------------------------

jatos-conf-dev-jatos-only:
	@$(JATOS_CONF_SCRIPT) deploy/env/dev-jatos-only.env

jatos-conf-dev-host-app:
	@$(JATOS_CONF_SCRIPT) deploy/env/dev-host-app.env

jatos-conf-dev-fullstack:
	@$(JATOS_CONF_SCRIPT) deploy/env/dev-fullstack.env

jatos-conf-prod:
	@$(JATOS_CONF_SCRIPT) deploy/env/prod.env

# ---------------------------------------------------------------------------
# Mode targets
# ---------------------------------------------------------------------------

dev-jatos-only: jatos-conf-dev-jatos-only
	@echo "dev-jatos-only $(SCRIPT_FLAGS)" > $(MODE_FILE)
	@$(SCRIPTS)/dev-jatos-only.sh $(SCRIPT_FLAGS)

dev-jatos-only-https: certs jatos-conf-dev-jatos-only
	@echo "dev-jatos-only --https $(SCRIPT_FLAGS)" > $(MODE_FILE)
	@$(SCRIPTS)/dev-jatos-only.sh --https $(SCRIPT_FLAGS)

dev-host-app: jatos-conf-dev-host-app
	@echo "dev-host-app $(SCRIPT_FLAGS)" > $(MODE_FILE)
	@$(SCRIPTS)/dev-host-app.sh $(SCRIPT_FLAGS)
	@echo ""
	@echo "Infrastructure is running. Start the app on the host:"
	@echo "  npm run dev"

dev-host-app-https: certs jatos-conf-dev-host-app
	@echo "dev-host-app --https $(SCRIPT_FLAGS)" > $(MODE_FILE)
	@$(SCRIPTS)/dev-host-app.sh --https $(SCRIPT_FLAGS)
	@echo ""
	@echo "Infrastructure is running (HTTPS). Start the app on the host:"
	@echo "  npm run dev"

dev-fullstack: jatos-conf-dev-fullstack
	@echo "dev-fullstack $(SCRIPT_FLAGS)" > $(MODE_FILE)
	@$(SCRIPTS)/dev-fullstack.sh $(SCRIPT_FLAGS)

dev-fullstack-https: certs jatos-conf-dev-fullstack
	@echo "dev-fullstack --https $(SCRIPT_FLAGS)" > $(MODE_FILE)
	@$(SCRIPTS)/dev-fullstack.sh --https $(SCRIPT_FLAGS)

prod-up: jatos-conf-prod
	@echo "prod-up" > $(MODE_FILE)
	@$(SCRIPTS)/prod-up.sh

prod-up-letsencrypt: jatos-conf-prod
	@echo "prod-up --letsencrypt" > $(MODE_FILE)
	@$(SCRIPTS)/prod-up.sh --letsencrypt

# ---------------------------------------------------------------------------
# Operations (resolve active mode from MODE_FILE)
# ---------------------------------------------------------------------------

define resolve-mode
	@if [ ! -f $(MODE_FILE) ]; then \
		echo "Error: no active mode. Start one first (e.g. make dev-fullstack)."; \
		exit 1; \
	fi
endef

define run-active
	$(call resolve-mode)
	@MODE_LINE=$$(cat $(MODE_FILE)); \
	SCRIPT=$$(echo "$$MODE_LINE" | awk '{print $$1}'); \
	FLAGS=$$(echo "$$MODE_LINE" | sed 's/^[^ ]* *//' | sed 's/^'"$$SCRIPT"'$$//'); \
	$(SCRIPTS)/$$SCRIPT.sh $$FLAGS $(1)
endef

down:
	$(call run-active,down)
	@rm -f $(MODE_FILE)

logs:
	$(call run-active,logs -f)

ps:
	$(call run-active,ps)

restart:
	$(call resolve-mode)
	@MODE_LINE=$$(cat $(MODE_FILE)); \
	SCRIPT=$$(echo "$$MODE_LINE" | awk '{print $$1}'); \
	FLAGS=$$(echo "$$MODE_LINE" | sed 's/^[^ ]* *//' | sed 's/^'"$$SCRIPT"'$$//'); \
	$(SCRIPTS)/$$SCRIPT.sh $$FLAGS down && \
	$(SCRIPTS)/$$SCRIPT.sh $$FLAGS up -d

build:
	$(call run-active,build)

clean:
	@echo "WARNING: This will remove all containers AND volumes!"
	@echo "All database data will be lost."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		if [ -f $(MODE_FILE) ]; then \
			MODE_LINE=$$(cat $(MODE_FILE)); \
			SCRIPT=$$(echo "$$MODE_LINE" | awk '{print $$1}'); \
			FLAGS=$$(echo "$$MODE_LINE" | sed 's/^[^ ]* *//' | sed 's/^'"$$SCRIPT"'$$//'); \
			$(SCRIPTS)/$$SCRIPT.sh $$FLAGS down -v; \
			rm -f $(MODE_FILE); \
		else \
			echo "No active mode recorded. Removing mlp-network containers..."; \
			docker network inspect mlp-network -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | \
				xargs -r docker rm -f 2>/dev/null || true; \
		fi; \
		echo "Done."; \
	else \
		echo "Cancelled."; \
	fi

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

certs:
	@$(SCRIPTS)/gen-certs.sh

validate-token:
	@echo "Validating JATOS token (host-based)..."
	@if [ -f deploy/env/dev-jatos-only.env ]; then \
		set -a; . deploy/env/dev-jatos-only.env; set +a; \
	elif [ -f deploy/env/dev-host-app.env ]; then \
		set -a; . deploy/env/dev-host-app.env; set +a; \
	fi; \
	if [ -f .env ]; then \
		set -a; . .env; set +a; \
	fi; \
	JATOS_BASE=$${JATOS_BASE:-http://jatos.localhost} \
	node scripts/validate-jatos-token.js

validate-setup:
	@npx tsx scripts/validate-setup.ts

prune:
	@echo "Pruning unused Docker resources (stopped containers, dangling images, build cache)..."
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -f; \
		echo "Done."; \
	else \
		echo "Cancelled."; \
	fi

prune-all:
	@echo "WARNING: This removes ALL unused Docker resources including volumes!"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -a --volumes -f; \
		echo "Done."; \
	else \
		echo "Cancelled."; \
	fi
