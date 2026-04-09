#!/usr/bin/env bash
set -e

# Convenience wrapper for the dev-host-app mode.
# Starts app Postgres + JATOS + MySQL + Traefik — app runs on the host.
#
# Usage:
#   ./deploy/scripts/dev-host-app.sh              # up -d
#   ./deploy/scripts/dev-host-app.sh down          # stop
#   ./deploy/scripts/dev-host-app.sh logs -f       # tail logs
#   ./deploy/scripts/dev-host-app.sh --https up -d # with local HTTPS
#   ./deploy/scripts/dev-host-app.sh --mail up -d  # with Mailhog
#
# Passes all arguments (after flags) to docker compose.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

HTTPS=false
MAIL=false
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --https) HTTPS=true ;;
    --mail)  MAIL=true ;;
    *) ARGS+=("$arg") ;;
  esac
done

ENV_FILE="deploy/env/dev-host-app.env"
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
  -f deploy/compose/modes/dev-host-app.yml
)

if [ "$MAIL" = true ]; then
  COMPOSE_FILES+=(-f deploy/compose/services/mailhog.yml)
fi

if [ "$HTTPS" = true ]; then
  COMPOSE_FILES+=(-f deploy/compose/modes/dev-local-https.yml)
fi

if [ ${#ARGS[@]} -eq 0 ]; then
  ARGS=(up -d)
fi

exec docker compose "${COMPOSE_FILES[@]}" "${ENV_FLAG[@]}" "${ARGS[@]}"
