#!/usr/bin/env bash
set -e

# Convenience wrapper for the prod mode.
# Starts the full production stack with optional Let's Encrypt TLS.
#
# Usage:
#   ./deploy/scripts/prod-up.sh                   # up -d (TLS externally or none)
#   ./deploy/scripts/prod-up.sh --letsencrypt      # with automatic Let's Encrypt TLS
#   ./deploy/scripts/prod-up.sh down               # stop
#   ./deploy/scripts/prod-up.sh logs -f            # tail logs
#
# Passes all arguments (after flags) to docker compose.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

LETSENCRYPT=false
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --letsencrypt) LETSENCRYPT=true ;;
    *) ARGS+=("$arg") ;;
  esac
done

ENV_FILE="deploy/env/prod.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found." >&2
  echo "Copy deploy/env/prod.env.example and fill in all values." >&2
  exit 1
fi

COMPOSE_FILES=(
  -f deploy/compose/base.yml
  -f deploy/compose/services/postgres.yml
  -f deploy/compose/services/jatos-db.yml
  -f deploy/compose/services/jatos.yml
  -f deploy/compose/services/traefik.yml
  -f deploy/compose/services/app.yml
  -f deploy/compose/services/cron-study-status.yml
  -f deploy/compose/modes/prod.yml
)

if [ "$LETSENCRYPT" = true ]; then
  COMPOSE_FILES+=(-f deploy/compose/modes/prod-online-https.yml)
  mkdir -p deploy/traefik/acme
fi

if [ ${#ARGS[@]} -eq 0 ]; then
  ARGS=(up -d --build)
fi

exec docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" "${ARGS[@]}"
