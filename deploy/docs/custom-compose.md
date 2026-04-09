# Custom Compose stacks

The `Makefile` targets and `deploy/scripts/*.sh` wrappers are **convenience**
shortcuts. The real layout is **modular**: `deploy/compose/base.yml`, optional
**service** fragments under `deploy/compose/services/`, and **mode** overlays
under `deploy/compose/modes/`. You can combine the same files yourself when a
named mode does not match your machine (for example: JATOS + Mailhog in Docker,
Postgres only on the host).

For **environment variables** (Compose vs root `.env`), see
[Environment variables — Two layers](environment-variables.md#two-layers-of-configuration).

---

## How layers fit together

1. **`deploy/compose/base.yml`** — Shared network (`mlp-network`). Include this first.
2. **Service files** — One or more of:
   `postgres.yml`, `jatos-db.yml`, `jatos.yml`, `traefik.yml`, `app.yml`,
   `mailhog.yml`, `cron-study-status.yml`.
3. **Mode overlay** — Adjusts labels, ports, or which services are implied:
   `dev-jatos-only.yml`, `dev-host-app.yml`, `dev-fullstack.yml`, `prod.yml`, etc.
4. **Optional TLS** — `dev-local-https.yml` (mkcert); for fullstack HTTPS also
   `dev-fullstack-https.yml`. Production Let’s Encrypt: `prod-online-https.yml`.

**Source of truth:** the exact `-f` chains live in `deploy/scripts/*.sh`. When in
doubt, open the script for the mode closest to what you want and copy or extend
its `COMPOSE_FILES` array.

---

## Canonical compose chains (reference)

Run all commands from the **repository root**.

| Script              | Compose files (conceptually)                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev-jatos-only.sh` | `base` → `jatos-db` → `jatos` → `traefik` → `dev-jatos-only` → optional `mailhog`, optional `dev-local-https`                                                         |
| `dev-host-app.sh`   | `base` → `postgres` → `jatos-db` → `jatos` → `traefik` → `dev-host-app` → optional `mailhog`, optional `dev-local-https`                                              |
| `dev-fullstack.sh`  | `base` → `postgres` → `jatos-db` → `jatos` → `traefik` → `app` → `dev-fullstack` → optional `mailhog`, `cron-study-status`, `dev-local-https` + `dev-fullstack-https` |
| `prod-up.sh`        | `base` → `postgres` → `jatos-db` → `jatos` → `traefik` → `app` → `cron-study-status` → `prod` → optional `prod-online-https`                                          |

---

## Environment files

Pass **`--env-file deploy/env/<mode>.env`** when you use variables from that
template. The script for each mode picks the matching file when it exists.

If you **mix** fragments from different modes, choose the env file that covers
the services you started (for example: only JATOS/MySQL → `dev-jatos-only.env`;
Postgres in Compose → include `POSTGRES_*` from `dev-host-app.env` or
`dev-fullstack.env`).

---

## Recipes

### JATOS + Mailhog, Postgres on the host

Use the **dev-jatos-only** script with Mailhog (same stack as `make dev-jatos-only`,
plus Mailhog):

```bash
MAIL=1 make dev-jatos-only
# or
./deploy/scripts/dev-jatos-only.sh --mail up -d
```

Run Postgres locally; set **`DATABASE_URL`** (and app secrets) in the **repository
root** `.env` when you run `npm run dev`. Configure email to Mailhog, e.g.
`SMTP_HOST=localhost`, `SMTP_PORT=1025` (see [Development — Email](development.md#email-development)).

### Manual `docker compose` (full control)

Example: same files as **dev-jatos-only** + Mailhog + local HTTPS:

```bash
docker compose \
  -f deploy/compose/base.yml \
  -f deploy/compose/services/jatos-db.yml \
  -f deploy/compose/services/jatos.yml \
  -f deploy/compose/services/traefik.yml \
  -f deploy/compose/modes/dev-jatos-only.yml \
  -f deploy/compose/services/mailhog.yml \
  -f deploy/compose/modes/dev-local-https.yml \
  --env-file deploy/env/dev-jatos-only.env \
  up -d
```

Add or drop `-f` lines to match the services you need. **Start** and **stop**
with the **same** `-f` list (and env file) so Compose tracks every service.

---

## Hazards

- **One stack on 80/443** — Do not run two Compose projects that both bind Traefik
  to the same ports. Stop one before starting another.
- **One JATOS definition** — Do not run an old root `docker-compose.yml` and
  `deploy/compose/` at the same time; you risk duplicate `jatos` containers and
  broken routing. See the deployment refactor notes in the repo if applicable.
- **Project name** — Compose derives the project name from the first compose file’s
  path; volumes are named per project. Keep your custom invocations consistent
  or set `COMPOSE_PROJECT_NAME` explicitly if you need stable volume names.

---

## See also

- [Development Guide](development.md) — named modes, HTTPS, Mailhog, email env
- [Environment variables](environment-variables.md)
- [Troubleshooting](troubleshooting.md) — ports, duplicate stacks
