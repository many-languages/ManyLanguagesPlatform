#!/usr/bin/env bash
set -e

CERT_DIR="$(dirname "$0")/../certs"
DOMAIN="jatos.localhost"
CERT_FILE="$CERT_DIR/$DOMAIN.pem"
KEY_FILE="$CERT_DIR/$DOMAIN-key.pem"

mkdir -p "$CERT_DIR"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
  echo "❌ mkcert not found!"
  echo "👉 Please install mkcert first: https://github.com/FiloSottile/mkcert"
  echo "   On Ubuntu:   sudo apt install libnss3-tools && brew install mkcert"
  echo "   On macOS:    brew install mkcert nss && mkcert -install"
  exit 1
fi

# Generate certs if missing
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "🔑 Generating mkcert certificates for $DOMAIN ..."
  mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" "$DOMAIN"
  echo "✅ Certificates generated at $CERT_DIR"
else
  echo "🔒 Certificates already exist at $CERT_DIR"
fi
