#!/usr/bin/env bash
set -e

# Generate mkcert TLS certificates for local HTTPS development.
# Certs are written to deploy/traefik/certs/.
#
# Usage: ./deploy/scripts/gen-certs.sh [domain ...]
# Default domains: jatos.localhost app.localhost

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../traefik/certs"

DOMAINS=("${@:-jatos.localhost app.localhost}")
if [ $# -eq 0 ]; then
  DOMAINS=(jatos.localhost app.localhost)
fi

mkdir -p "$CERT_DIR"

if ! command -v mkcert &> /dev/null; then
  echo "mkcert not found."
  echo "Install it first:"
  echo "  Linux:  sudo apt install libnss3-tools && brew install mkcert"
  echo "  macOS:  brew install mkcert nss && mkcert -install"
  exit 1
fi

for DOMAIN in "${DOMAINS[@]}"; do
  CERT_FILE="$CERT_DIR/$DOMAIN.pem"
  KEY_FILE="$CERT_DIR/$DOMAIN-key.pem"

  if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "Certificates already exist for $DOMAIN — skipping."
  else
    echo "Generating certificates for $DOMAIN ..."
    mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" "$DOMAIN"
    echo "Done: $CERT_FILE, $KEY_FILE"
  fi
done
