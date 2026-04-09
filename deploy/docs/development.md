# Development Guide

This guide covers local development workflows for contributors to the
ManyLanguages Platform.

## Prerequisites

- Docker Engine and Docker Compose v2 (`docker compose` plugin)
- Node.js 20+ and npm (for host-app modes)
- At least 4 GB RAM available
- Ports 80, 443, 3000, and 5433 available (varies by mode)
- For local HTTPS: `mkcert` installed and trusted

### /etc/hosts

If `jatos.localhost` or `app.localhost` do not resolve on your machine:

```bash
echo "127.0.0.1 jatos.localhost app.localhost" | sudo tee -a /etc/hosts
```

---

## Modes overview

| Mode               | App                  | App DB        | JATOS  | When to use                             |
| ------------------ | -------------------- | ------------- | ------ | --------------------------------------- |
| **dev-jatos-only** | host (or off)        | host (or off) | Docker | JATOS API integration work              |
| **dev-host-app**   | host (`npm run dev`) | Docker        | Docker | Day-to-day feature work                 |
| **dev-fullstack**  | Docker               | Docker        | Docker | Onboarding, CI parity, full-stack repro |

Pick the lightest mode that fits your task. Most daily work uses
**dev-host-app** (fast hot-reload on the host, databases in Docker).

### Configuration: where variables live

There are two layers (full detail: [Environment variables](environment-variables.md#two-layers-of-configuration)):

| Layer                       | File                      | Used when                                                                                                                                                                               |
| --------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`deploy/env/<mode>.env`** | Copy from `*.env.example` | Always for **Compose** — MySQL, JATOS domain, Postgres _if_ that mode runs Postgres in Docker.                                                                                          |
| **Repository root `.env`**  | Copy from `.env.example`  | Whenever you run **the app on the host** (`npm run dev`, Prisma): `DATABASE_URL`, `SESSION_SECRET_KEY`, `JATOS_TOKEN`, `JATOS_BASE`, `NEXT_PUBLIC_JATOS_BASE`, email to localhost, etc. |

**dev-fullstack** / **prod:** configure the app and databases via **`deploy/env/`** for that mode; you do not need a root `.env` **to run** the stack in Docker.

**dev-host-app:** **`deploy/env/dev-host-app.env`** for infrastructure + **root `.env`** for the app.

**dev-jatos-only:** **`deploy/env/dev-jatos-only.env`** for JATOS/MySQL only. If you also run the platform app locally (with your own Postgres), put app-side variables in **root `.env`** — not only in `deploy/env/dev-jatos-only.env`.

For stacks that do not match a named mode (or to add optional services by hand),
see [Custom Compose](custom-compose.md).

---

## dev-jatos-only

Standalone JATOS for API integration work. No app container, no app database.

1. Create an env file (first time only):

   ```bash
   cp deploy/env/dev-jatos-only.env.example deploy/env/dev-jatos-only.env
   ```

2. Start:

   ```bash
   make dev-jatos-only
   ```

3. Open JATOS at `http://jatos.localhost`. First login: **admin / admin**.

If you run the platform app on the host (and Postgres locally or elsewhere),
configure **`DATABASE_URL`**, **`JATOS_TOKEN`**, **`JATOS_BASE`**,
**`NEXT_PUBLIC_JATOS_BASE`**, **`SESSION_SECRET_KEY`**, etc. in the **repository
root** `.env`. See [Configuration: where variables live](#configuration-where-variables-live).

Stop with `make down`.

---

## dev-host-app

App runs on the host with hot reload; Postgres + JATOS + Traefik in Docker.

1. Create an env file (first time only):

   ```bash
   cp deploy/env/dev-host-app.env.example deploy/env/dev-host-app.env
   ```

2. Start infrastructure:

   ```bash
   make dev-host-app
   ```

   Add Mailhog for email testing: `MAIL=1 make dev-host-app`

3. Start the app on the host:

   ```bash
   npm run dev
   ```

4. Create a [JATOS API token](#jatos-api-token) and add it to your **root**
   `.env` (required for `npm run dev`). You can mirror the token in
   `deploy/env/dev-host-app.env` for reference; Compose does not run an app
   container in this mode.

5. Run service account provisioning (once):

   ```bash
   npm run ensure-service-account
   ```

Stop with `make down`.

---

## dev-fullstack

Everything in Docker. Good for onboarding or reproducing the deployed stack.

1. Create an env file (first time only):

   ```bash
   cp deploy/env/dev-fullstack.env.example deploy/env/dev-fullstack.env
   ```

2. Start:

   ```bash
   make dev-fullstack
   ```

   Variants:

   ```bash
   MAIL=1 make dev-fullstack              # with Mailhog
   CRON=1 make dev-fullstack              # with study-status cron
   MAIL=1 CRON=1 make dev-fullstack       # both
   ```

3. Create a [JATOS API token](#jatos-api-token) and add it to
   `deploy/env/dev-fullstack.env`, then `make restart`.

Stop with `make down`.

---

## Local HTTPS (mkcert)

Any dev mode can be run with local HTTPS.

1. Install mkcert:

   - **Linux:** `sudo apt install libnss3-tools && brew install mkcert && mkcert -install`
   - **macOS:** `brew install mkcert nss && mkcert -install`

2. Generate certificates:

   ```bash
   make certs
   ```

3. Start with the HTTPS variant:

   ```bash
   make dev-jatos-only-https
   make dev-host-app-https
   make dev-fullstack-https
   ```

JATOS is then at `https://jatos.localhost`, app at `https://app.localhost`.

---

## JATOS API token

The JATOS API token must be created manually through the JATOS UI.

1. Open JATOS (`http://jatos.localhost` or `https://jatos.localhost`).
2. Log in: **admin / admin** (change after first login).
3. Click your username (top-right) → **API Tokens**.
4. Click **New Token**, name it (e.g. `mlp-token`), click **Generate**.
5. **Copy the token** — it is shown only once.
6. Add the token and JATOS URLs where the **app** reads them:

   - **Always** add to **repository root `.env`** when you run the app on the
     host (including **dev-host-app** and **dev-jatos-only** with `npm run dev`):

   ```env
   JATOS_TOKEN=your-token-here
   JATOS_BASE=http://jatos.localhost
   NEXT_PUBLIC_JATOS_BASE=http://jatos.localhost
   ```

   Use `https://jatos.localhost` if you use a local HTTPS mode.

   - For **dev-fullstack** / **prod**, add `JATOS_TOKEN` to the matching
     **`deploy/env/*.env`** file instead (and `make restart`).

7. Restart: `make restart` (or recreate containers after editing deploy env)

### Validating the token

```bash
make validate-token
```

This runs a host-based check that does not start any containers.

---

## JATOS service account

The app uses a JATOS service account (`mlp-service-account`, VIEWER role)
for participant-facing read operations.

- **dev-fullstack:** provisioned automatically at app startup.
- **dev-jatos-only / dev-host-app:** run manually once:

  ```bash
  npm run ensure-service-account
  ```

The script is idempotent. JATOS must be reachable when it runs.

### Upgrading from older deployments

If upgrading from a version that predates the service account, run **after**
the first start:

```bash
npm run provision-researchers
npm run provision-service-studies
```

Fresh installs do not need these steps.

---

## Email (development)

Add Mailhog to your mode:

```bash
MAIL=1 make dev-jatos-only
MAIL=1 make dev-host-app
MAIL=1 make dev-fullstack
```

See [Custom Compose](custom-compose.md) for how these map to compose files and
for manual `docker compose -f` examples.

**Where to set `EMAIL_*` and `SMTP_*`:**

| App runs on the host (`npm run dev`) | App runs in Docker (`docker compose` fullstack)            |
| ------------------------------------ | ---------------------------------------------------------- |
| **Repository root `.env`**           | **`deploy/env/dev-fullstack.env`** (or `prod.env` in prod) |

`deploy/env/dev-jatos-only.env` and `deploy/env/dev-host-app.env` configure **Compose**
only; they do **not** feed the Next.js process. When you run the app locally, use
root `.env` for email (see [Environment variables — Two layers](environment-variables.md#two-layers-of-configuration)).

**Host app + Mailhog** (dev-jatos-only, dev-host-app, or standalone Mailhog on `1025`):

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=mailhog
EMAIL_FROM_ADDRESS="ManyLanguages Platform <noreply@example.com>"
SMTP_HOST=localhost
SMTP_PORT=1025
```

`SMTP_HOST=localhost` is correct when Mailhog publishes port `1025` on the host
(`MAIL=1` targets, or `docker run` as below). Mailhog UI: `http://localhost:8025`

**dev-fullstack** with Mailhog in Compose: set the same flags in
`deploy/env/dev-fullstack.env`, but use **`SMTP_HOST=mailhog`** (Docker service name)

For host-app mode without Docker Mailhog:

```bash
docker run --rm -p 1025:1025 -p 8025:8025 mailhog/mailhog:v1.0.1
```

Then keep `SMTP_HOST=localhost` and `SMTP_PORT=1025` in your root `.env`.

---

## Makefile targets

Run `make help` for the full listing.

| Target                | Action                             |
| --------------------- | ---------------------------------- |
| `make dev-jatos-only` | Start JATOS-only mode              |
| `make dev-host-app`   | Start host-app mode                |
| `make dev-fullstack`  | Start fullstack mode               |
| `make dev-*-https`    | Any mode with local HTTPS          |
| `make down`           | Stop active mode                   |
| `make logs`           | Tail logs                          |
| `make ps`             | List containers                    |
| `make restart`        | Stop + start                       |
| `make build`          | Rebuild app image                  |
| `make clean`          | Stop + remove volumes (data loss!) |
| `make certs`          | Generate mkcert certificates       |
| `make validate-token` | Check JATOS token                  |
| `make prune`          | Clean unused Docker resources      |

## Convenience scripts

For CI or when you need to pass extra `docker compose` arguments:

| Script                               | Mode           |
| ------------------------------------ | -------------- |
| `./deploy/scripts/dev-jatos-only.sh` | dev-jatos-only |
| `./deploy/scripts/dev-host-app.sh`   | dev-host-app   |
| `./deploy/scripts/dev-fullstack.sh`  | dev-fullstack  |

Scripts accept flags (`--https`, `--mail`, `--cron`) and pass remaining
arguments to `docker compose`:

```bash
./deploy/scripts/dev-fullstack.sh --https --mail logs -f
./deploy/scripts/dev-fullstack.sh down
```

---

## Service URLs (defaults)

| Service       | URL                       |
| ------------- | ------------------------- |
| App           | `http://localhost:3000`   |
| JATOS         | `http://jatos.localhost`  |
| JATOS (HTTPS) | `https://jatos.localhost` |
| PostgreSQL    | `localhost:5433`          |
| Mailhog UI    | `http://localhost:8025`   |
