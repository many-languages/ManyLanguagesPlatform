#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEMPLATE_FILE="$ROOT_DIR/deploy/jatos/jatos.conf.template"
OUTPUT_FILE="$ROOT_DIR/deploy/jatos/jatos.conf"
ENV_FILE_INPUT="${1:-.env}"

if [[ "$ENV_FILE_INPUT" = /* ]]; then
  ENV_FILE="$ENV_FILE_INPUT"
else
  ENV_FILE="$ROOT_DIR/$ENV_FILE_INPUT"
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template missing: $TEMPLATE_FILE" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  echo "Pass an env file, e.g. scripts/render-jatos-conf.sh deploy/env/dev-host-app.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$(dirname "$OUTPUT_FILE")"
envsubst < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
echo "Rendered $OUTPUT_FILE from $ENV_FILE"
