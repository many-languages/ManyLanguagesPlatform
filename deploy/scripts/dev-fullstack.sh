#!/usr/bin/env bash
set -e

# Convenience wrapper for the dev-fullstack mode.
# Starts app + Postgres + JATOS + MySQL + Traefik — everything in Docker.
#
# Usage:
#   ./deploy/scripts/dev-fullstack.sh                  # up -d
#   ./deploy/scripts/dev-fullstack.sh down              # stop
#   ./deploy/scripts/dev-fullstack.sh logs -f           # tail logs
#   ./deploy/scripts/dev-fullstack.sh --https up -d     # with local HTTPS
#   ./deploy/scripts/dev-fullstack.sh --mail up -d      # with Mailhog
#   ./deploy/scripts/dev-fullstack.sh --cron up -d      # with study-status cron
#   ./deploy/scripts/dev-fullstack.sh --mail --cron     # combine flags
#
# Passes all arguments (after flags) to docker compose.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

HTTPS=false
MAIL=false
CRON=false
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --https) HTTPS=true ;;
    --mail)  MAIL=true ;;
    --cron)  CRON=true ;;
    *) ARGS+=("$arg") ;;
  esac
done

ENV_FILE="deploy/env/dev-fullstack.env"
ENV_FLAG=()
if [ -f "$ENV_FILE" ]; then
  ENV_FLAG=(--env-file "$ENV_FILE")
fi

COMPOSE_FILES=(
  -f deploy/compose/base.yml
  -f deploy/compose/services/postgres.yml
  -f deploy/compose/services/jatos-db.yml
  -f deploy/compose/services/jatos.yml
  -f deploy/compose/services/traefik.yml
  -f deploy/compose/services/app.yml
  -f deploy/compose/modes/dev-fullstack.yml
)

if [ "$MAIL" = true ]; then
  COMPOSE_FILES+=(-f deploy/compose/services/mailhog.yml)
fi

if [ "$CRON" = true ]; then
  COMPOSE_FILES+=(-f deploy/compose/services/cron-study-status.yml)
fi

if [ "$HTTPS" = true ]; then
  COMPOSE_FILES+=(-f deploy/compose/modes/dev-local-https.yml)
  COMPOSE_FILES+=(-f deploy/compose/modes/dev-fullstack-https.yml)
fi

if [ ${#ARGS[@]} -eq 0 ]; then
  ARGS=(up -d)
fi

exec docker compose "${COMPOSE_FILES[@]}" "${ENV_FLAG[@]}" "${ARGS[@]}"
