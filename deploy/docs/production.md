# Production Guide

This guide covers deploying, securing, and maintaining the ManyLanguages
Platform in production. If you haven't deployed yet, start with the
[Getting Started](getting-started.md) guide first.

---

## Starting the production stack

**With Let's Encrypt (recommended):**

```bash
make prod-up-letsencrypt
```

Requires `TLS_EMAIL`, `APP_DOMAIN`, and `JATOS_DOMAIN` in
`deploy/env/prod.env`, DNS resolving to this host, and ports 80+443 open.

**Without automatic TLS** (handled externally or not needed):

```bash
make prod-up
```

Or use the script directly:

```bash
./deploy/scripts/prod-up.sh --letsencrypt    # with Let's Encrypt
./deploy/scripts/prod-up.sh                   # without
```

---

## Security checklist

1. **Change all default passwords** — every `CHANGE_ME` in `prod.env`.
2. **Use a strong `SESSION_SECRET_KEY`** — generate with `openssl rand -base64 48`.
3. **Change the JATOS admin password** on first login.
4. **Configure HTTPS** — use Let's Encrypt (above) or a managed TLS provider.
5. **Do not expose PostgreSQL externally** — the default host port 5433 should
   be firewalled. Only the app accesses Postgres over the internal Docker network.
6. **Rotate `JATOS_TOKEN` periodically** — create a new token in the JATOS UI,
   update `prod.env`, and restart.
7. **Keep Docker images updated** — `make prod-up-letsencrypt` rebuilds the app;
   pull fresh base images with `./deploy/scripts/prod-up.sh pull`.

---

## HTTPS with Let's Encrypt

The `prod-online-https.yml` overlay configures Traefik to obtain certificates
automatically via the ACME TLS challenge.

Requirements:

- `TLS_EMAIL` set in your env file (ACME contact email).
- DNS A records for `APP_DOMAIN` and `JATOS_DOMAIN` pointing to this server.
- Ports 80 and 443 open and not used by another process.

Certificates are stored in `deploy/traefik/acme/` and renewed automatically.

If you see certificate errors immediately after starting, wait 1–2 minutes
for Traefik to complete the ACME challenge.

### HTTP → HTTPS redirect

The production HTTPS overlay automatically redirects all HTTP traffic to HTTPS.

---

## Scheduled jobs (study status)

The `cron-study-status` service calls `/api/cron/study-status` every 15
minutes to open studies at their `startDate` and close them at `endDate`.
It is included automatically in production.

Set `CRON_SECRET` in your env file.

**Alternative (system cron):**

```bash
*/15 * * * * curl -s -H "X-Cron-Secret: $CRON_SECRET" https://app.your-domain.com/api/cron/study-status
```

**Alternative (AWS EventBridge):** target the same URL with `rate(15 minutes)`.

---

## Email (production)

Set in `deploy/env/prod.env`:

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=postmark
EMAIL_FROM_ADDRESS="ManyLanguages Platform <noreply@your-domain.com>"
POSTMARK_SERVER_TOKEN=your-postmark-token
POSTMARK_MESSAGE_STREAM=outbound
```

The app uses the Postmark API when `EMAIL_PROVIDER=postmark`. Generic SMTP
is also supported — set `EMAIL_PROVIDER=smtp` with `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_SECURE`.

---

## Backups

### Database backup

```bash
# App database (PostgreSQL)
docker compose exec postgres pg_dump -U blitz manylanguagesplatform > backup.sql

# JATOS database (MySQL)
docker compose exec jatos-db mysqldump -u jatos -p jatos > jatos-backup.sql
```

### Database restore

```bash
# App database
docker compose exec -T postgres psql -U blitz manylanguagesplatform < backup.sql

# JATOS database
docker compose exec -T jatos-db mysql -u jatos -p jatos < jatos-backup.sql
```

### Volume data

Docker volumes persist across restarts:

| Volume             | Contents                |
| ------------------ | ----------------------- |
| `postgres-data`    | App PostgreSQL database |
| `jatos-db-data`    | JATOS MySQL database    |
| `jatos-study-data` | JATOS study asset files |

For a full backup, you can also export volumes directly:

```bash
docker run --rm -v compose_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data.tar.gz -C /data .
```

---

## Updating

```bash
cd ManyLanguagesPlatform
git pull
make prod-up-letsencrypt
```

Database migrations run automatically on app startup. The app waits for
JATOS to be ready before starting.

---

## Lightsail / VPS specifics

- **Minimum instance:** Ubuntu 22.04 LTS, 2 GB RAM, static IP.
- **Enable 2 GB swap** — see [Getting Started](getting-started.md#step-3--add-swap-space).
- **Firewall:** open ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
- **DNS:** create A records for `app.your-domain.com` and `jatos.your-domain.com`.
- Certificates are issued automatically when DNS resolves and port 443 is open.

---

## Monitoring

```bash
# Container status
make ps

# Live logs
make logs

# Resource usage
docker stats

# Disk usage
docker system df
```

---

## Clean reset (data loss!)

To remove all containers and volumes and start fresh:

```bash
make clean
```

This destroys all databases and study files. Back up first.
