# Release Runbook

This is the durable release procedure for deploying the platform. It assumes
the Docker-based production stack under `deploy/` and the app/JATOS split
documented in `deploy/docs/production.md` and
`deploy/docs/environment-variables.md`.

## Pre-Release Checks

Run from the repository root:

```bash
npm run lint
npm run build
npm run test
npm run validate:jatos-architecture
make validate-setup
```

For DB-backed tests, start and stop the isolated test database:

```bash
npm run test:db:up
npm run test
npm run test:db:down
```

Before release, verify:

- `deploy/env/prod.env` has no `CHANGE_ME`, development passwords, or empty
  production secrets.
- `SESSION_SECRET_KEY`, `JATOS_TOKEN`, `CRON_SECRET`, database passwords, and
  email provider secrets are set.
- `APP_DOMAIN`, `APP_ORIGIN`, `JATOS_DOMAIN`, `JATOS_BASE`, and
  `NEXT_PUBLIC_JATOS_BASE` match the public deployment.
- HTTPS/DNS are ready for the chosen production mode.
- Backups have been taken and a restore has been rehearsed.

## Backup

Take backups immediately before deployment when production data exists:

```bash
# App database (PostgreSQL)
docker compose exec postgres pg_dump -U blitz manylanguagesplatform > backup.sql

# JATOS database (MySQL)
docker compose exec jatos-db mysqldump -u jatos -p jatos > jatos-backup.sql
```

Also back up the JATOS study file volume when uploaded studies or participant
runs exist. PostgreSQL-only backups are not sufficient because JATOS owns study
assets and run/result data.

## Deploy

With automatic Let's Encrypt TLS:

```bash
make prod-up-letsencrypt
```

With TLS handled externally:

```bash
make prod-up
```

The app startup runs database migrations and waits for JATOS readiness through
the deployment scripts. Watch logs during rollout:

```bash
make logs
make ps
```

## Post-Deploy Smoke Test

Use a production-like account set and verify:

- Sign up/log in works.
- Researcher can create or open a study.
- Researcher cannot access another researcher's study by changing the URL ID.
- Participant can open an assigned study and sees only their own feedback.
- Admin dashboard loads for admin users.
- Non-admin users cannot access admin pages.
- JATOS-backed flows fail gracefully if JATOS is unavailable.
- Email links use the correct `APP_ORIGIN`.

## Rollback

Rollback depends on whether migrations changed the database.

If the app deploy failed before destructive schema/data changes:

1. Revert to the previous commit.
2. Rebuild/restart with `make prod-up-letsencrypt` or `make prod-up`.
3. Check logs and smoke-test critical flows.

If migrations or data writes need to be undone:

1. Stop app traffic if possible.
2. Restore PostgreSQL from the pre-release backup.
3. Restore JATOS MySQL and study file volume if the release touched JATOS
   studies, runs, users, or study assets.
4. Deploy the previous known-good app revision.
5. Run the post-deploy smoke test.

Never restore only one of PostgreSQL or JATOS when the failed release changed
both sides of the platform/JATOS boundary.

## Operational Checks

After release:

- Confirm `cron-study-status` is running and `/api/cron/study-status` accepts
  only the configured `CRON_SECRET`.
- Confirm Postmark/SMTP delivery if email is enabled.
- Confirm no JATOS/admin/service tokens appear in logs.
- Confirm disk usage for Docker volumes is healthy.
- Confirm admin study approval and researcher/participant dashboards still load.
