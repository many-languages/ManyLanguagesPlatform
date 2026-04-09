# Environment Variables

This is the complete reference for all environment variables used by the
ManyLanguages Platform deployment. Template files live in `deploy/env/`.

---

## Two layers of configuration

There are **two** places configuration can live. They are not interchangeable.

| Layer        | Location                   | Read by                                      | Purpose                                                                                                                                                                              |
| ------------ | -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Compose**  | `deploy/env/<mode>.env`    | `docker compose` (`--env-file`)              | Container env: MySQL, Traefik, Postgres _when it is a Compose service_, and the **app container** in **dev-fullstack** / **prod**. Values substitute into `deploy/compose/**/*.yml`. |
| **Host app** | Repository **root** `.env` | Next.js / Blitz, Prisma, local `npm` scripts | Required when the **app runs on your machine** (`npm run dev`, migrations). Holds `DATABASE_URL`, `SESSION_SECRET_KEY`, `JATOS_TOKEN`, `JATOS_BASE`, `NEXT_PUBLIC_JATOS_BASE`, etc.  |

**Rule of thumb:** If the app process runs **on the host**, put app secrets and `DATABASE_URL` in **root `.env`**. If **everything** runs in Docker for that mode, put what the stack needs in **`deploy/env/`** for that mode (you do not need a root `.env` **to run** the containers).

**`POSTGRES_*` in `deploy/env/`:** Only used when the **postgres** service is in Compose (**dev-host-app**, **dev-fullstack**, **prod**). If Postgres runs only on the host, configure access with **`DATABASE_URL`** in root `.env` (no `POSTGRES_*` in `deploy/env` for that).

**dev-jatos-only + app on host:** `deploy/env/dev-jatos-only.env` configures JATOS/MySQL in Docker only. If you also run the platform app locally (with Postgres on the host or on another port), add **`JATOS_TOKEN`**, **`JATOS_BASE`**, **`NEXT_PUBLIC_JATOS_BASE`**, **`DATABASE_URL`**, **`SESSION_SECRET_KEY`**, and related app vars to **root `.env`** — the same as for **dev-host-app**, even though Compose does not include the app.

---

## Quick setup

Copy the template for your mode and fill in values:

```bash
# Development
cp deploy/env/dev-jatos-only.env.example deploy/env/dev-jatos-only.env
cp deploy/env/dev-host-app.env.example   deploy/env/dev-host-app.env
cp deploy/env/dev-fullstack.env.example  deploy/env/dev-fullstack.env

# Production
cp deploy/env/prod.env.example deploy/env/prod.env
```

When you run **the app on the host** (`npm run dev`), also copy **`.env.example`**
to **`.env`** at the repository root and fill in app variables there.

---

## MySQL (JATOS database)

Used by the `jatos-db` service and consumed by JATOS.

| Variable              | Default    | Required | Description         |
| --------------------- | ---------- | -------- | ------------------- |
| `MYSQL_ROOT_PASSWORD` | `rootpass` | prod     | MySQL root password |
| `MYSQL_DATABASE`      | `jatos`    | —        | Database name       |
| `MYSQL_USER`          | `jatos`    | —        | Database user       |
| `MYSQL_PASSWORD`      | `devpass`  | prod     | Database password   |

In production, use strong random values for both passwords.

---

## JATOS

| Variable       | Default           | Required | Description                           |
| -------------- | ----------------- | -------- | ------------------------------------- |
| `JATOS_TOKEN`  | _(empty)_         | yes      | Admin API token (created in JATOS UI) |
| `JATOS_DOMAIN` | `jatos.localhost` | prod     | Domain for Traefik routing            |

The token must be created manually — see [Development Guide](development.md#jatos-api-token)
or [Getting Started](getting-started.md#step-10--create-a-jatos-api-token).

---

## PostgreSQL (app database)

Used by the `postgres` service. Not needed for `dev-jatos-only`.

| Variable             | Default                 | Required | Description                                     |
| -------------------- | ----------------------- | -------- | ----------------------------------------------- |
| `POSTGRES_USER`      | `blitz`                 | —        | Database user                                   |
| `POSTGRES_PASSWORD`  | `devpass`               | prod     | Database password                               |
| `POSTGRES_DB`        | `manylanguagesplatform` | —        | Database name                                   |
| `POSTGRES_HOST_PORT` | `5433`                  | —        | Host port (avoids conflict with local Postgres) |

---

## App (Next.js / Blitz)

Used by the **`app` Docker service** in **dev-fullstack** and **prod** — set
these in the matching `deploy/env/*.env` so Compose injects them into the
container.

When the **app runs on the host** (**dev-host-app**, or **dev-jatos-only**
with `npm run dev`), set these in the **repository root** `.env` instead.
See [Two layers of configuration](#two-layers-of-configuration).

| Variable                 | Default                  | Required  | Description                             |
| ------------------------ | ------------------------ | --------- | --------------------------------------- |
| `DATABASE_URL`           | _(auto-constructed)_     | host only | PostgreSQL connection string            |
| `JATOS_BASE`             | `http://jatos:9000`      | host only | Server-side JATOS URL                   |
| `NEXT_PUBLIC_JATOS_BASE` | `http://jatos.localhost` | yes       | Browser-side JATOS URL                  |
| `SESSION_SECRET_KEY`     | `dev-secret-key...`      | prod      | Blitz session encryption key            |
| `NODE_ENV`               | `development`            | —         | `development` or `production`           |
| `PORT`                   | `3000`                   | —         | App listen port                         |
| `APP_DOMAIN`             | `app.localhost`          | prod      | Domain for Traefik routing              |
| `CRON_SECRET`            | _(empty)_                | prod      | Secret for cron endpoint authentication |

> `DATABASE_URL` is constructed automatically in Docker modes from the
> `POSTGRES_*` variables. Set it manually only when the app runs on the host.

> `JATOS_BASE` is `http://jatos:9000` inside Docker (internal hostname) and
> `http://jatos.localhost` (or `https://...`) when the app runs on the host.

---

## Email

| Variable                  | Default    | Required      | Description                      |
| ------------------------- | ---------- | ------------- | -------------------------------- |
| `EMAIL_ENABLED`           | `false`    | —             | Enable email delivery            |
| `EMAIL_PROVIDER`          | `mailhog`  | —             | `mailhog`, `postmark`, or `smtp` |
| `EMAIL_FROM_ADDRESS`      | _(empty)_  | when enabled  | Sender address                   |
| `SMTP_HOST`               | `mailhog`  | smtp only     | SMTP server hostname             |
| `SMTP_PORT`               | `1025`     | smtp only     | SMTP port                        |
| `SMTP_USER`               | _(empty)_  | smtp only     | SMTP username                    |
| `SMTP_PASSWORD`           | _(empty)_  | smtp only     | SMTP password                    |
| `SMTP_SECURE`             | `false`    | smtp only     | Use TLS for SMTP                 |
| `POSTMARK_SERVER_TOKEN`   | _(empty)_  | postmark only | Postmark API token               |
| `POSTMARK_MESSAGE_STREAM` | `outbound` | postmark only | Postmark message stream          |

---

## TLS

| Variable    | Default   | Required      | Description                         |
| ----------- | --------- | ------------- | ----------------------------------- |
| `TLS_EMAIL` | _(empty)_ | Let's Encrypt | Contact email for ACME certificates |

Only needed when using `prod-online-https.yml` (Let's Encrypt).

---

## Variables by mode

**yes** = set in **`deploy/env/<mode>.env`** for Compose. **host `.env`** =
repository root `.env` (Next.js / Blitz when you run `npm run dev`). **auto** =
constructed in Compose from `POSTGRES_*` or defaults in `app.yml`.

| Variable                 | dev-jatos-only | dev-host-app | dev-fullstack |     prod      |
| ------------------------ | :------------: | :----------: | :-----------: | :-----------: |
| `MYSQL_*`                |      yes       |     yes      |      yes      |      yes      |
| `JATOS_TOKEN`            |       —        | host `.env`  |      yes      |      yes      |
| `JATOS_DOMAIN`           |      yes       |     yes      |      yes      |      yes      |
| `POSTGRES_*`             |       —        |     yes      |      yes      |      yes      |
| `DATABASE_URL`           |       —        | host `.env`  |     auto      |     auto      |
| `JATOS_BASE`             |       —        | host `.env`  |     auto      |     auto      |
| `NEXT_PUBLIC_JATOS_BASE` |       —        | host `.env`  |      yes      |      yes      |
| `SESSION_SECRET_KEY`     |       —        | host `.env`  |      yes      |      yes      |
| `APP_DOMAIN`             |       —        |      —       |      yes      |      yes      |
| `CRON_SECRET`            |       —        |      —       |   optional    |      yes      |
| `EMAIL_*`                |       —        |   optional   |   optional    |      yes      |
| `TLS_EMAIL`              |       —        |      —       |       —       | Let's Encrypt |

You may mirror `JATOS_TOKEN` in `deploy/env/dev-host-app.env` for convenience;
Compose does not run an **app** container in that mode, so only **root `.env`**
is required for the running app.

If you use **dev-jatos-only** but also run the platform app on the host (with
Postgres on the host or another port), set **`JATOS_TOKEN`**, **`JATOS_BASE`**,
**`NEXT_PUBLIC_JATOS_BASE`**, **`DATABASE_URL`**, **`SESSION_SECRET_KEY`**, and
related app variables in **root `.env`** — same as **dev-host-app**. They are
not read from `deploy/env/dev-jatos-only.env` by the Node process.
