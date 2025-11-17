#!/usr/bin/env bash
set -e

CERT_DIR="$(dirname "$0")/../certs"
DOMAINS=("localhost" "app.localhost" "jatos.localhost")
CERT_FILE="$CERT_DIR/localhost.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

mkdir -p "$CERT_DIR"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
  echo "❌ mkcert not found!"
  echo "👉 Please install mkcert first: https://github.com/FiloSottile/mkcert"
  echo ""
  echo "   On Ubuntu/Debian:"
  echo "     sudo apt install libnss3-tools"
  echo "     # Then install mkcert (see https://github.com/FiloSottile/mkcert#linux)"
  echo ""
  echo "   On macOS:"
  echo "     brew install mkcert nss"
  echo "     mkcert -install"
  echo ""
  exit 1
fi

# Generate certs if missing
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "🔑 Generating mkcert certificates for ${DOMAINS[*]} ..."
  mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" "${DOMAINS[@]}"
  echo "✅ Certificates generated at $CERT_DIR"
  echo ""
  echo "📝 Certificates cover:"
  for domain in "${DOMAINS[@]}"; do
    echo "   - $domain"
  done
else
  echo "🔒 Certificates already exist at $CERT_DIR"
fi

