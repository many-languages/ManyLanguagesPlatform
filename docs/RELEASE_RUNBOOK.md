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

## Study Deletion Reconciliation

Study deletion crosses two systems: the app PostgreSQL database and JATOS. The
delete workflow should try to delete the JATOS study before deleting the app
`Study` row, because the app row contains the linkage needed to find JATOS
state. This operation is not atomic across systems, so treat delete failures as
operational incidents until both sides have been checked.

Use this reconciliation procedure when a researcher/admin reports a failed
study delete, when logs show a delete failure, or after restoring only one side
of the app/JATOS boundary.

1. Identify the app study row in PostgreSQL, if it still exists:

   ```sql
   SELECT
     s.id,
     s.title,
     s."jatosStudyUUID",
     s.archived,
     s.status,
     u."jatosStudyId",
     u."versionNumber",
     u."createdAt"
   FROM "Study" s
   LEFT JOIN "JatosStudyUpload" u ON u."studyId" = s.id
   WHERE s.id = <study_id>
   ORDER BY u."versionNumber" DESC;
   ```

2. Check whether the corresponding JATOS study still exists using the JATOS
   admin UI or JATOS API, using `Study.jatosStudyUUID` and the latest
   `JatosStudyUpload.jatosStudyId` when available.

3. Reconcile according to the observed state:

| State                                    | Meaning                                                                                                          | Operator action                                                                                                                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App study exists, JATOS study exists     | Delete did not complete or was never attempted.                                                                  | Retry the normal app delete flow after confirming authorization and response/archive rules.                                                                                                                                             |
| App study exists, JATOS study is missing | JATOS deletion likely succeeded but app DB deletion failed.                                                      | If deletion was authorized and intended, delete the app `Study` row through the app/admin flow if possible. If the app flow cannot proceed because JATOS is missing, perform a supervised DB deletion after taking a PostgreSQL backup. |
| App study missing, JATOS study exists    | App DB deletion completed but JATOS deletion did not, or PostgreSQL was restored without matching JATOS restore. | Delete the orphaned JATOS study through the JATOS admin UI/API, or restore the matching PostgreSQL backup if the app deletion was unintended.                                                                                           |
| App study missing, JATOS study missing   | Deletion completed on both sides.                                                                                | No action beyond recording the incident/resolution if this was part of a failed-delete investigation.                                                                                                                                   |

4. Before any supervised DB deletion, take a fresh PostgreSQL backup. If JATOS
   still has participant runs or study assets, also take/confirm the relevant
   JATOS MySQL and study-volume backups.

5. After reconciliation, run the relevant smoke checks:

- Admin/researcher study lists no longer show deleted studies.
- Participant dashboards no longer expose deleted/removed study links.
- JATOS admin UI no longer shows deleted JATOS studies unless retention policy
  intentionally keeps them.
- Logs/errors from the original failure do not contain service tokens, run URLs,
  or raw participant payloads.

## Operational Checks

After release:

- Confirm `cron-study-status` is running and `/api/cron/study-status` accepts
  only the configured `CRON_SECRET`.
- Confirm Postmark/SMTP delivery if email is enabled.
- Confirm no JATOS/admin/service tokens appear in logs.
- Confirm disk usage for Docker volumes is healthy.
- Confirm admin study approval and researcher/participant dashboards still load.
