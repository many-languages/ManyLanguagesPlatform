# Deployment Guide

All deployment artifacts for the ManyLanguages Platform live under `deploy/`.

## Architecture

| Service | Image | Purpose |
|---------|-------|---------|
| **app** | Next.js/Blitz (custom Dockerfile) | Main application |
| **postgres** | `postgres:16-alpine` | App database (Prisma) |
| **jatos** | `jatos/jatos:3.10.1` | Study management server |
| **jatos-db** | `mysql:8.0` | JATOS database |
| **traefik** | `traefik:v2.11` | Reverse proxy / TLS termination |
| **mailhog** | `mailhog/mailhog:v1.0.1` | Dev email catcher (optional) |
| **cron-study-status** | `alpine/curl` | Scheduled study open/close (optional) |

Each service is defined **once** in `deploy/compose/services/*.yml`.
Deployment **modes** select which services to run and apply environment-specific overrides.

### Configuration and environment files

- **`deploy/env/<mode>.env`** — Passed to **Docker Compose** (`--env-file`). It configures **containers** (MySQL, Traefik, Postgres when it runs in Compose, and the **app** container in **dev-fullstack** / **prod**).
- **Repository root `.env`** — Read by **Next.js / Blitz** when the **app runs on your machine** (`npm run dev`, Prisma). Use it for `DATABASE_URL`, `SESSION_SECRET_KEY`, `JATOS_TOKEN`, JATOS URLs, etc.

If everything for a mode runs in Docker, you usually only need **`deploy/env/`** for that mode. If the app runs on the host, you need **root `.env`** for the app. See [Environment variables — Two layers](docs/environment-variables.md#two-layers-of-configuration).

```text
Browser ──▸ Traefik :80/:443
              ├── jatos.localhost ──▸ jatos:9000
              └── app.localhost   ──▸ app:3000

app ──▸ postgres:5432      (app DB)
app ──▸ jatos:9000         (JATOS API, internal)
jatos ──▸ jatos-db:3306    (JATOS DB)
```

## Modes

| Mode | App | App DB | JATOS | Typical use |
|------|-----|--------|-------|-------------|
| **dev-jatos-only** | host | host | Docker | JATOS-only integration work |
| **dev-host-app** | host | Docker | Docker | Day-to-day full-app development |
| **dev-fullstack** | Docker | Docker | Docker | Onboarding, CI parity |
| **prod** | Docker | Docker | Docker | Deployed environment |

**dev-local-https** is a TLS overlay applied on top of any dev mode.

> **Warning:** Never run two modes simultaneously that both publish ports 80/443.
> Stop one before starting another.

## Directory layout

```text
deploy/
├── README.md                    ← you are here
├── docs/
│   ├── getting-started.md       # Self-hosting guide (for researchers / new deployers)
│   ├── development.md           # Local development workflows (for contributors)
│   ├── production.md            # Production deployment, security, backups
│   ├── environment-variables.md # Full env var reference
│   ├── custom-compose.md        # Advanced: assemble your own -f chain
│   └── troubleshooting.md       # Common issues and fixes
├── compose/
│   ├── base.yml                 # shared networks / naming
│   ├── services/                # one canonical definition per service
│   │   ├── app.yml
│   │   ├── postgres.yml
│   │   ├── jatos.yml
│   │   ├── jatos-db.yml
│   │   ├── traefik.yml
│   │   ├── mailhog.yml
│   │   └── cron-study-status.yml
│   └── modes/                   # thin overlays (labels, TLS, entrypoints)
│       ├── dev-jatos-only.yml
│       ├── dev-host-app.yml
│       ├── dev-fullstack.yml
│       ├── dev-fullstack-https.yml
│       ├── dev-local-https.yml
│       ├── prod.yml
│       └── prod-online-https.yml
├── env/                         # .env.example templates per mode
├── traefik/                     # Traefik certs, dynamic config, ACME state
├── jatos/                       # jatos.conf, API reference (see jatos/README.md)
└── scripts/                     # Convenience wrappers and cert generation
```

## Where to start

| I want to... | Read this |
|--------------|-----------|
| **Run my own instance** on a VPS or server | [Getting Started](docs/getting-started.md) |
| **Develop locally** on the codebase | [Development Guide](docs/development.md) |
| **Harden or maintain** a production deployment | [Production Guide](docs/production.md) |
| **Look up an environment variable** | [Environment Variables](docs/environment-variables.md) |
| **Assemble a custom Docker stack** (pick compose fragments) | [Custom Compose](docs/custom-compose.md) |
| **Fix a problem** | [Troubleshooting](docs/troubleshooting.md) |

## Quick reference

```bash
# Development
make dev-jatos-only             # JATOS only
make dev-host-app               # infra in Docker, app on host
make dev-fullstack              # everything in Docker
make dev-fullstack-https        # with local HTTPS

# Production
make prod-up                    # TLS handled externally
make prod-up-letsencrypt        # automatic Let's Encrypt

# Operations (auto-detects active mode)
make down                       # stop
make logs                       # tail logs
make ps                         # list containers
make restart                    # stop + start
make clean                      # stop + remove volumes (data loss!)

# Utilities
make certs                      # generate mkcert certs
make validate-token             # check JATOS token
make prune                      # clean unused Docker resources
```
