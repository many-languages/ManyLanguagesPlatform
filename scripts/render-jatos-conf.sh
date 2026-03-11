#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEMPLATE_FILE="$ROOT_DIR/deploy/jatos/jatos.conf.template"
OUTPUT_FILE="$ROOT_DIR/deploy/jatos/jatos.conf"
ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template missing: $TEMPLATE_FILE" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo ".env file not found; run \"make dev\" or create .env from .env.example" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$(dirname "$OUTPUT_FILE")"
envsubst < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
