# Data Lifecycle

This document explains what data the platform stores, where it lives, and how
it moves through the app. The key operational fact is that platform metadata
lives in the app PostgreSQL database through Prisma, while JATOS study assets
and participant run/result data live in JATOS's own storage.

## Storage Systems

| System            | Backing store                                            | Owns                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App database      | PostgreSQL, accessed through Prisma (`db/schema.prisma`) | Users, sessions, app study metadata, researcher/participant memberships, setup state, codebook, feedback templates, extraction snapshots, notifications, admin invites, JATOS linkage metadata. |
| JATOS database    | JATOS MySQL database                                     | JATOS users, studies, batches, workers/study codes, study runs, result metadata, and JATOS internal state.                                                                                      |
| JATOS study files | JATOS study file volume                                  | Uploaded `.jzip` study assets and extracted study build files managed by JATOS.                                                                                                                 |
| Email provider    | Mailhog/Postmark/SMTP                                    | Outbound email delivery metadata handled by the provider. The app stores admin invite and password reset token state separately.                                                                |
| Logs              | Container/app host logs                                  | Operational events and errors. Logs must not include tokens or raw participant result payloads.                                                                                                 |

Production backups must cover both PostgreSQL and JATOS. Backing up only the
app database is not enough to restore participant runs or uploaded JATOS study
assets.

## App Database Data

The app database stores the platform's application state:

| Data                 | Prisma models                                                 | Notes                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users and auth       | `User`, `Session`, `Token`                                    | Includes user profile fields, role, hashed password, sessions, and password reset tokens.                                                                |
| JATOS user linkage   | `ResearcherJatos`, `SystemConfig`                             | Maps app researchers to JATOS users and stores service-account configuration such as `jatosServiceUserID`.                                               |
| Study metadata       | `Study`                                                       | Title, description, dates, sample size, payment description, length, app open/closed status, admin approval, archive state, and current JATOS UUID link. |
| Researchers          | `StudyResearcher`                                             | Study membership and researcher role (`PI`, `COLLABORATOR`, `VIEWER`).                                                                                   |
| Participants         | `ParticipantStudy`                                            | Participant membership, pseudonym, personal JATOS run URL, active flag, and payment flag.                                                                |
| JATOS upload linkage | `JatosStudyUpload`                                            | Versioned app record of imported JATOS builds: JATOS IDs, component/batch IDs, worker type, build hash, and setup completion flags.                      |
| Pilot links          | `PilotLink`                                                   | Researcher pilot run URLs and marker tokens linked to a JATOS upload.                                                                                    |
| Variable extraction  | `PilotDatasetSnapshot`, `ExtractionSnapshot`, `StudyVariable` | Cached/approved extraction metadata and variable inventory derived from pilot JATOS results.                                                             |
| Codebook             | `Codebook`, `CodebookEntry`                                   | Variable descriptions and personal-data flags.                                                                                                           |
| Feedback             | `FeedbackTemplate`                                            | Feedback template content and required variable names. Rendered participant feedback is generated at read time.                                          |
| Notifications        | `Notification`, `NotificationRecipient`                       | App notifications, read/dismiss/pin state, optional study link.                                                                                          |
| Admin invites        | `AdminInvite`                                                 | Single-use admin invite token, email, expiry, redemption/revocation/reminder state.                                                                      |

The app database stores JATOS identifiers and selected derived metadata, but it
does not own the authoritative JATOS run/result records.

## JATOS-Owned Data

JATOS owns the study runtime and participant/run data:

- Imported study builds and assets from `.jzip` uploads.
- JATOS study IDs, UUIDs, component IDs, batch IDs, and worker configuration.
- Study codes and personal run URLs generated through JATOS.
- Study runs and result metadata.
- Raw participant result payloads.
- JATOS users and study memberships used by the JATOS API.

The platform reads JATOS data through `src/lib/jatos/jatosAccessService.ts`.
Raw JATOS result payloads should be narrowed before reaching the browser.
Participant-facing feedback should return rendered markdown and UI-safe
metadata, not full cohort arrays.

## Study Lifecycle

1. A researcher creates a `Study` in PostgreSQL.
2. Researchers are linked through `StudyResearcher`.
3. A `.jzip` upload is imported into JATOS through `/api/jatos/import`.
4. The app records JATOS linkage in `Study.jatosStudyUUID` and
   `JatosStudyUpload`.
5. Pilot links and pilot result data are created/read through JATOS.
6. The app derives variable snapshots and codebook data into PostgreSQL.
7. Feedback templates are stored in PostgreSQL and rendered using JATOS result
   data at read time.
8. Admins approve or reject studies in PostgreSQL.
9. Study open/closed state is stored on `Study.status`; the cron workflow
   updates it from `startDate` and `endDate`.

## Participant Lifecycle

1. A participant joins or is assigned to a study, creating `ParticipantStudy`.
2. The app assigns a `pseudonym` and may store a personal `jatosRunUrl`.
3. The participant completes the study in JATOS; the run/result is stored by
   JATOS, not Prisma.
4. The app checks completion by reading JATOS metadata and matching by
   pseudonym.
5. Participant feedback is rendered from the feedback template plus the
   participant's JATOS result and any allowed aggregate values.
6. Payment/admin tracking such as `payed` and `active` lives in
   `ParticipantStudy`.

## Deletion and Archive

Archive and delete have different meanings:

- **Archive** keeps app database records and blocks normal researcher edits.
- **Researcher delete** is allowed only when the study has no participant
  responses, according to the study lifecycle rules.
- **Admin delete** is privileged and attempts to delete the JATOS study as well
  as the app database study.

Because study rows use cascading relations, deleting a `Study` from PostgreSQL
also removes app-owned child records such as memberships, upload linkage,
codebook, feedback template, notifications, and extraction records. It does
not by itself remove JATOS-owned MySQL rows or study asset files; JATOS deletion
must happen through the JATOS workflow.

If JATOS deletion fails, treat the system as partially deleted and resolve it
operationally before considering the data fully removed.

## Backups and Restore

For production restore, keep these in sync:

- PostgreSQL backup: app users, studies, memberships, templates, codebook, and
  app linkage.
- JATOS MySQL backup: JATOS runtime state, users, studies, runs, result
  metadata.
- JATOS study data volume backup: uploaded/extracted study files.

Restoring PostgreSQL without JATOS can leave studies with broken JATOS links.
Restoring JATOS without PostgreSQL can leave participant runs and study assets
that the app no longer references.

See `deploy/docs/production.md` for backup and restore commands.

## Retention Decisions

The current codebase supports archive/delete behavior, but long-term retention
policy is a product/compliance decision. Before handling real participant data,
decide and document:

- How long JATOS raw result data is retained.
- Whether participant accounts can request deletion.
- Whether pseudonyms/run URLs are considered personal or sensitive data in your
  deployment context.
- How backups are expired.
- Who may export raw or cleaned study data.
