# Authorization Model

This document is the source of truth for who may access which application
surfaces and where authorization must be enforced. UI hiding is never the
authorization boundary; every server entry point must enforce access before
reading or writing protected data.

## Roles

Application roles are defined by `UserRole` in `db/schema.prisma`:

| Role          | Purpose                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `RESEARCHER`  | Creates and manages studies, uploads JATOS builds, reviews pilot/results data for studies they belong to. |
| `PARTICIPANT` | Joins assigned/open studies, opens personal run URLs, and views only their own feedback/status.           |
| `ADMIN`       | Reviews and manages platform studies and operational admin surfaces.                                      |
| `SUPERADMIN`  | Staff admin plus admin invitation management.                                                             |

Staff admin checks should use `src/lib/auth/roles.ts` helpers where possible.

### Accounts can hold more than one role

`User.roles` lists everything an account may act as. The role it is acting as _right now_ lives
only in the session (`session.role`), and every authorization guard (`resolver.authorize`,
`session.role` checks, layouts) reads that. Account roles in the database are only used to decide
what the session may switch to and who counts as an admin when sending to or listing users.

- The only supported combination is `RESEARCHER` + `ADMIN`. A researcher gains `ADMIN` by
  accepting an admin invitation; participants and existing admins are never eligible
  (`getAdminInviteEligibility` in `src/lib/auth/roles.ts`, enforced on the server when the invite
  is created, validated, accepted and reminded — not only in the UI).
- A fresh login, signup or password reset starts as the highest role held (`pickInitialRole`).
- `switchActiveRole` re-reads `User.roles` from the database and updates only the current session.
- Never filter users with a bare `role`; use `staffAdminUsersWhere()` / `userHasAnyRoleWhere()` so
  accounts holding a role alongside another are not missed.
- UI that depends on the role (dashboards, navbar) uses the session role, not `currentUser.roles`.

## Server Entry Points

Every server entry point needs explicit server-side authorization:

- Blitz RPC: `src/features/*/queries/*.ts` and `src/features/*/mutations/*.ts`
- Next server actions: `src/features/*/actions/*.ts`
- Route handlers: `src/app/api/**/route.ts`
- Cron endpoints and background workflows
- RSC/server helpers that routes call directly

Blitz `resolver.authorize()` is useful, but application-level access rules
must live in feature server helpers too. A helper that can be called directly
from a Server Component, action, or route must be safe without relying only on
the Blitz wrapper.

## Study Access

Researcher study access is based on `StudyResearcher` membership. Researcher
reads should use `withStudyAccess` or an equivalent feature guard. Researcher
writes should use `withStudyWriteAccess` or a stricter helper that also checks
archived/editability rules.

Canonical helpers:

- `src/features/studies/server/withStudyAccess.ts`
- `src/features/studies/server/withStudyWriteAccess.ts`
- `src/features/studies/server/verifyResearcherStudyAccess.ts`

Rules:

- A researcher may read a study only if they are a member of that study.
- A researcher may write setup/study data only when membership and write policy pass.
- Archived studies block normal researcher setup/write operations.
- Changing URL IDs must not reveal another researcher's study.

## Participant Access

Participant access is based on `ParticipantStudy` membership and the
participant's `pseudonym`. Participant flows must never expose another
participant's run URL, JATOS result, feedback, payment state, or completion
state.

Rules:

- A participant may see only their own `ParticipantStudy` rows.
- A participant may view feedback only for their own study participation.
- Participant JATOS lookups should use the participant's pseudonym as the
  matching key and return UI-safe output, not raw cohort payloads.
- Joining a study creates or reuses the participant's own membership and run
  URL only for that user.

## Admin Access

Admin routes live under `src/app/admin/**`. Access must be enforced in the
admin layout/pages and again in any server helper or mutation that performs
admin work.

Rules:

- `ADMIN` and `SUPERADMIN` are staff admins.
- `SUPERADMIN` is required for admin invitation management.
- An admin may not approve or reject a study they are a researcher on, even when one account holds
  both roles. `approveStudy`/`rejectStudy` reject the whole batch before writing
  (`src/features/studies/domain/selfReview.ts`); the admin UI hides those actions and the study is
  left out of the pending-review queue and review notifications. Another admin has to review it.
- Admin invitation tokens are stored only as a hash and are shown once, when created. They are not
  stored readably, so an existing invite's token can never be displayed again. A superadmin who
  needs a link again uses "New link" (`regenerateAdminInviteLink`), which issues a fresh token,
  invalidates the one that was emailed, and is recorded in the admin audit log. Never add a
  readable copy of a token to the database, a list query or the audit log.
- Accepting an admin invitation from an existing account (`acceptAdminInvite`) requires the
  emailed token, not just a matching email: signup does not verify email ownership, so an account
  email alone proves nothing. Acceptance is recorded in `AdminInvite.redeemedById` and the admin
  audit log.
- Admin study approval/rejection and admin study deletion are privileged
  operations.
- Admin deletion may touch both the app database and JATOS; see
  `docs/JATOS_API_USAGE.md` for the JATOS-specific workflow.

## Notifications

Each notification has an `audience` (`PORTAL` or `ADMIN`). A user sees only the inbox that matches
the role they are acting as (`notificationAudienceForRole`), so an account holding both roles has
a separate feed and unread badge in each area and never gets a link into an area its current role
cannot open. Notifications to admins (e.g. a study awaiting review) must be sent with
`audience: "ADMIN"`.

## JATOS Authorization

JATOS access is server-only. Application code should call
`jatosAccessService` use-case methods instead of importing low-level
`src/lib/jatos/client/*` modules directly.

Rules:

- Browser code must never receive JATOS admin, researcher, service, or bearer
  tokens.
- JATOS calls must pass narrow identifiers such as `studyId`, `userId`, and
  `pseudonym`, not session objects.
- Researcher JATOS calls must verify app-level researcher access.
- Participant read flows use the service/viewer token path where documented in
  `docs/JATOS_API_USAGE.md`.
- Study code creation for participants uses delegated researcher authority
  because JATOS requires a USER token for that endpoint.

## Data Exposure

Server helpers should return explicit DTOs or selected shapes. Do not return
full Prisma records or raw JATOS result payloads to the browser unless that
surface intentionally needs the full payload.

High-risk data:

- JATOS tokens and service credentials
- Session tokens and password reset tokens
- Participant pseudonyms and personal run URLs
- Raw JATOS result data
- Feedback variables marked as personal data
- Admin invitation tokens

## Review Checklist

When adding a server entry point:

- [ ] Validate input with Zod or a narrow parser.
- [ ] Authorize by role, study membership, participant membership, or admin guard.
- [ ] Keep meaningful authorization inside the server helper, not only in a Blitz wrapper.
- [ ] Return the smallest UI-safe shape.
- [ ] Do not log tokens, raw participant payloads, or private run URLs.
