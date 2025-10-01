# JATOS Deployment (with Traefik + Postgres)

This directory contains a ready-to-use Docker Compose setup for running **JATOS** with a dedicated Postgres database and automatic HTTPS via **Traefik + Let's Encrypt**.

---

## 🚀 Quick start

__1.__ Copy environment template
```bash
cp .env.example .env
```

Edit `.env` with your production settings (domain, passwords, email).

__2.__ Start in production (Let's Encrypt TLS)
```bash
make prod
```

JATOS will be available at:
`https://<your-domain>` (with automatic TLS via Let's Encrypt)

## 🔧 Local development

You can run JATOS locally in two ways: plain HTTP or HTTPS with mkcert.

### Plain HTTP (simplest)
__1.__ Copy `.env.example` → `.env.local`
```env
JATOS_DOMAIN=jatos.localhost
```

__2.__ Run:
```bash
make dev-http
```

__3.__ Access JATOS at: [http://jatos.localhost]

### Local HTTPS with mkcert

Useful if you need to test secure cookies or redirect flows.

__1.__ Install mkcert
On Linux:
```bash
sudo apt install mkcert
sudo apt install libnss3-tools
mkcert -install
```

On macOS:
```bash
brew install mkcert nss 
mkcert -install
```
__2.__ Generate local certs for your dev domain:
```bash
mkcert -key-file ./certs/jatos.localhost-key.pem -cert-file ./certs/jatos.localhost.pem "jatos.localhost"
```
`
_(Alternatively, run `make certs` which will auto-generate them using scripts/gen-certs.sh.)_

__3.__ Update your .env.local:
```env
JATOS_DOMAIN=jatos.localhost
```

__4.__ Run:
```bash
make dev-https
```

__5.__ Access JATOS at: [http://jatos.localhost]

## 📦 Data persistence

- Postgres data → jatos-db-data volume
- JATOS study files → jatos-study-data volume
- TLS certs (production) → letsencrypt volume
- TLS certs (local mkcert) → ./certs/ folder

These persist between restarts.

## 🛠 Makefile commands

- `make dev-http` → Local dev, plain HTTP
- `make dev-https` → Local dev, HTTPS with mkcert
- `make prod` → Production with Let's Encrypt
- `make stop` → Stop containers
- `make logs` → Tail logs
- `make clean` → Remove containers + volumes (! data loss !)