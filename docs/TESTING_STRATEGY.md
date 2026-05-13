# Testing Strategy

This document defines the expected test coverage for the MVP and future
maintenance. The goal is not full end-to-end coverage everywhere; it is strong
coverage around authorization, participant privacy, JATOS boundaries, and
state-changing workflows.

## Test Commands

Primary commands:

```bash
npm run test
npm run lint
npm run build
npm run validate:jatos-architecture
```

Database-backed tests use the isolated test Postgres flow:

```bash
npm run test:db:up
npm run test
npm run test:db:down
```

Vitest uses the root `.env.test` file. Do not point tests at development or
production databases.

## What To Unit Test

Prefer unit tests for pure domain logic:

- Study lifecycle rules: archive/delete allowed or blocked.
- Setup completion and navigation rules.
- Feedback DSL parsing, required variable extraction, and personal-data policy.
- Variable extraction and aggregation helpers.
- Date/status utility logic.
- JATOS parser/utility functions that do not require a live JATOS service.

Unit tests should not call live JATOS or depend on production-like secrets.

## What To DB-Test

Use DB-backed tests for access rules and persistence behavior where Prisma
relations matter:

- Researcher can access only their own studies.
- Participant can access only their own participation and feedback context.
- Admin-only and superadmin-only operations allow and deny correctly.
- Study deletion/archive cascades or blocks as expected.
- Admin invite creation, revocation, redemption, and stale reminder logic.
- Codebook and feedback template writes preserve authorization and validation.

Keep test data small and explicit. Prefer factories only when they remove real
duplication.

## What To Mock

Mock JATOS for normal automated tests:

- `jatosAccessService` methods
- Low-level JATOS client functions when testing the service layer itself
- JATOS metadata/result payloads
- Email sending providers

Automated tests should verify how the app responds to JATOS success, outage,
authorization failure, malformed payloads, and empty result sets without
requiring a live JATOS server.

## Manual Smoke Coverage

Manual smoke tests are required for release because this app crosses browser,
Blitz/Next, PostgreSQL, JATOS, and email boundaries.

Minimum release smoke:

- Sign up/log in.
- Researcher creates or links a study.
- Researcher views own study.
- Researcher is denied for a forbidden study ID.
- Participant opens assigned study.
- Participant views only own feedback.
- Admin opens dashboard.
- Non-admin is denied from admin routes.
- JATOS unavailable produces controlled errors and no token leakage.
- Delete/archive behavior matches the documented lifecycle.

Run smoke tests in staging or a production-like local stack when possible.

## Coverage Priorities

Highest-priority automated coverage:

- Authorization guards and role checks.
- Participant privacy and cross-participant denial.
- Study membership checks for researcher routes/actions.
- Admin and superadmin-only workflows.
- JATOS integration boundaries and token non-exposure.
- Destructive or irreversible writes.
- Data lifecycle writes that touch both PostgreSQL and JATOS linkage.

Lower-priority or post-MVP coverage:

- Full browser E2E for every setup step.
- Visual regression testing.
- Exhaustive component tests for mostly presentational UI.
- Load/performance testing beyond obvious query and JATOS bottlenecks.

## Regression Rule

Every serious pre-release bug should leave behind either:

- A focused automated regression test, or
- A documented manual repro when automation is impractical before release.

Prefer testing the smallest layer that would have caught the bug.
