#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE=".env.test"
PROJECT_NAME="mlp-test-db"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

ARGS=("$@")
if [ ${#ARGS[@]} -eq 0 ]; then
  ARGS=(up -d)
fi

exec docker compose \
  --project-name "$PROJECT_NAME" \
  -f deploy/compose/services/postgres.yml \
  --env-file "$ENV_FILE" \
  "${ARGS[@]}"
