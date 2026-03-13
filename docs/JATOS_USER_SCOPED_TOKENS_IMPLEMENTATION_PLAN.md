# JATOS User-Scoped API Tokens Implementation Plan

## Post-Refactor Status (Updated)

The JATOS integration has been refactored per [JATOS_REFACTOR_PLAN.md](./JATOS_REFACTOR_PLAN.md). Key changes:

- **Architecture**: `jatosAccessService` (use-case API) → `tokenBroker` (token resolution) → `jatosClient` (client/\*.ts, auth-injected transport).
- **Admin libs**: Now in `src/lib/jatos/client/` (createJatosUser, createJatosUserToken, addStudyMember, removeStudyMember). All require `auth: JatosAuth`.
- **Token resolution**: Consolidated in `tokenBroker.ts` — `getTokenForResearcher(userId)`, `getTokenForStudyService(studyId)`, `getAdminToken()`.
- **Import flow**: `provisioning/importJatosStudy.ts` — called by `POST /api/jatos/import` (sole API route). No `importJatos` mutation.
- **API routes**: All removed except `POST /api/jatos/import`. Researcher/participant flows use server actions that call `jatosAccessService` directly.
- **Call sites**: Use `jatosAccessService.*ForResearcher` or `*ForParticipant`; no direct API route calls for study data.

See [JATOS_API_USAGE.md](./JATOS_API_USAGE.md) for current usage patterns.

---

## Overview

This plan describes how to migrate from using a single JATOS admin token for all operations to a **defense-in-depth model with three token types**:

1. **Admin token** (`JATOS_TOKEN`) — Used **only for provisioning**: creating JATOS users, minting tokens, adding/removing study members. Never used for study data access.
2. **Researcher JIT tokens** — Short-lived (1-hour), generated on-demand via `tokenCache.ts`, used for **all researcher-initiated JATOS operations** (both reads and writes) on studies the researcher is a member of. This ensures JATOS enforces access control: if our app has an authorization bug, a researcher's token still can't access studies they aren't a member of.
3. **Service account token** — A non-admin JATOS user added as a member of every study, used **exclusively for participant flows** where no researcher is in session (e.g., participant feedback, completion checks, participant dashboard). Generated JIT via `tokenCache.ts`, same as researcher tokens.

### Security Properties

- **Admin token compromised**: Can provision users/tokens and manage membership, but cannot read study data (admin is not a study member).
- **Researcher token compromised**: Expires in 1 hour. Only grants access to studies that researcher is a member of.
- **Service account token compromised**: Has member access to all studies. Used for participant flows (reads and study code creation). (Once JATOS supports a READER role, we may need to keep the service account as MEMBER to retain study code creation, or revisit the design.)

### Design Principle: Strict Token Separation

Token selection is determined by **who initiated the action**, not by whether the operation is a read or write:

- **Researcher in session** → Always use that researcher's JIT token (reads and writes)
- **Participant in session** → Always use service account token (reads and writes, including study code creation at join)
- **System/background job** → Service account token for both reads and writes

This strict separation means lib functions must be **token-agnostic** — they accept a `token` parameter and work identically regardless of which token type is passed. The call site is responsible for resolving the appropriate token.

### Pending JATOS API Change

We have requested that the JATOS developer add an optional **READER role** to the study membership API (`PUT /studies/{id}/members/{userId}`). Until this is implemented, the service account is added as a regular `MEMBER`. The service account is used for participant flows including study code creation (which requires write access). When the READER role becomes available, we must either: (a) keep the service account as MEMBER to retain study code creation, or (b) add a separate mechanism for that write operation.

### JATOS API Endpoints Used

The JATOS API v1.1.0 (documented in `deploy/jatos/jatos-api.yaml`) provides:

- `POST /jatos/api/v1/users` – Create user (admin only)
- `POST /jatos/api/v1/users/{id}/tokens` – Generate API token (admin or self)
- `PUT /jatos/api/v1/studies/{id}/members/{userId}` – Add member to study
- `DELETE /jatos/api/v1/studies/{id}/members/{userId}` – Remove member

---

## Current Implementation Status

### Phase 1: Database Schema — DONE

`ResearcherJatos` model in `db/schema.prisma`:

```prisma
model ResearcherJatos {
  id          Int @id @default(autoincrement())
  userId      Int @unique // 1:1 with User (researchers only)
  jatosUserId Int // JATOS user ID (from POST /users)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

No `encryptedJatosToken` — researcher tokens are generated JIT and cached in memory. The column was added in migration `20260311093918_jatostoken` and intentionally dropped in `20260311102053_update_researcher_jatos`.

**Design decision:** 1-hour token expiration is a security feature, not a limitation. Short-lived tokens minimize the impact of compromise. The JIT approach via `tokenCache.ts` (55-min cache TTL) handles regeneration transparently.

### Phase 2: Admin Provisioning API — DONE

**Admin API libs** (in `src/lib/jatos/client/`, all require `auth: JatosAuth`; provisioning passes `getAdminToken()`):

| File                                           | Purpose                                                 |
| ---------------------------------------------- | ------------------------------------------------------- |
| `src/lib/jatos/client/createJatosUser.ts`      | `POST /users` — create JATOS user                       |
| `src/lib/jatos/client/createJatosUserToken.ts` | `POST /users/{id}/tokens` — mint API token              |
| `src/lib/jatos/client/addStudyMember.ts`       | `PUT /studies/{id}/members/{userId}` — add member       |
| `src/lib/jatos/client/removeStudyMember.ts`    | `DELETE /studies/{id}/members/{userId}` — remove member |

**Provisioning orchestration:**

| File                                                        | Purpose                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `src/lib/jatos/provisioning/provisionResearcherJatos.ts`    | Idempotent: create JATOS user + `ResearcherJatos` record |
| `src/lib/jatos/provisioning/ensureResearcherJatosMember.ts` | Provision if needed + add as study member                |
| `src/lib/jatos/provisioning/importJatosStudy.ts`            | Full import: JATOS upload + DB + membership sync         |

**Integration points:**

- **Signup** (`src/app/(auth)/mutations/signup.ts`): Best-effort `provisionResearcherJatos` for new researchers.
- **Import** (`src/app/api/jatos/import/route.ts`): Calls `importJatosStudyForResearcher` which does JATOS upload, DB updates, and `ensureResearcherJatosMember` for all study researchers.

**Token resolution** (`src/lib/jatos/tokenBroker.ts`): `getTokenForResearcher`, `getTokenForStudyService`, `getAdminToken`. JIT token cache is internal to tokenBroker. Researcher and service account flows use these; jatosAccessService never calls `getAdminToken()`.

All admin API libs and provisioning functions have tests.

---

## Remaining Implementation

### Phase 3: Service Account Setup

The service account is a non-admin JATOS user whose sole purpose is to provide study data access for participant-facing flows where no researcher is in session. It is **provisioned automatically at startup** and stored in the database — no manual steps or env vars required.

#### 3.1 Database Schema for Service Account

**Add to `db/schema.prisma`:**

```prisma
model SystemConfig {
  key   String @id
  value String
}
```

Migration creates the table. The service account JATOS user ID is stored under key `jatosServiceUserID`.

#### 3.2 Idempotent Provisioning at Startup

**New file:** `src/lib/jatos/provisioning/ensureServiceAccount.ts`

```ts
export async function ensureServiceAccount(): Promise<number> {
  const existing = await db.systemConfig.findUnique({
    where: { key: "jatosServiceUserID" },
  })
  if (existing) return parseInt(existing.value, 10)

  const { id } = await createJatosUser({
    username: "mlp-service-account",
    name: "MLP Service Account",
  })

  await db.systemConfig.create({
    data: { key: "jatosServiceUserID", value: String(id) },
  })
  return id
}
```

**Startup integration:** Run `ensureServiceAccount()` after `prisma migrate deploy` in the Docker entrypoint / startup sequence (both dev and prod). Idempotent — on subsequent starts, returns existing ID without calling JATOS. Requires JATOS to be reachable (dev already waits 45s; prod may need similar if JATOS starts slowly).

**New file:** `scripts/ensure-service-account.ts` — thin script that calls `ensureServiceAccount()` and logs the result. Invoked from the entrypoint. Consider retry logic if JATOS is not yet ready on first deploy.

#### 3.3 Service Account Token Resolution

**New file:** `src/lib/jatos/serviceAccount.ts`

Since the service account token expires after 1 hour (same as researcher tokens), we reuse the JIT pattern. The JATOS user ID is read from the DB and cached in memory (immutable after provisioning):

```ts
let cachedServiceUserId: number | null = null

async function getServiceAccountJatosUserId(): Promise<number | null> {
  if (cachedServiceUserId != null) return cachedServiceUserId
  const config = await db.systemConfig.findUnique({
    where: { key: "jatosServiceUserID" },
  })
  if (!config) return null
  cachedServiceUserId = parseInt(config.value, 10)
  return cachedServiceUserId
}

export async function getServiceAccountToken(): Promise<string> {
  const jatosUserId = await getServiceAccountJatosUserId()
  if (jatosUserId == null) {
    console.warn("[JATOS] Service account not provisioned, falling back to JATOS_TOKEN")
    return process.env.JATOS_TOKEN!
  }
  return getOrGenerateJatosToken(jatosUserId, "service-account")
}
```

This reuses `tokenCache.ts` — the service account is just another JATOS user whose token is cached for 55 minutes and regenerated via the admin token when it expires.

**No env vars** — `JATOS_SERVICE_USER_ID` is not used. The service account ID lives in the database.

#### 3.4 Service Account Membership Sync

At study import time, the service account must be added as a member of the newly imported study.

**Update:** `src/lib/jatos/provisioning/importJatosStudy.ts` (already includes this)

After the existing researcher membership sync:

```ts
const jatosUserId = await getServiceAccountJatosUserId()
if (jatosUserId != null) {
  await addStudyMember({
    studyId: jatosStudyId,
    userId: jatosUserId,
    // role: "READER" — when JATOS supports it
  })
}
```

**Export:** `getServiceAccountJatosUserId` must be exported from `serviceAccount.ts` for use in import and migration scripts.

**Tests:**

- Service account is added as study member at import
- Import succeeds even if service account is not yet provisioned (graceful degradation)

---

### Phase 4: Token Resolution

#### 4.1 Researcher Token Resolution (Current User)

**New file:** `src/lib/jatos/getTokenForResearcher.ts`

Resolves the **current researcher's** JIT token. Used when the researcher is in session and performing operations on their own studies.

```ts
export async function getTokenForResearcher(userId: number): Promise<string>
```

1. Look up `ResearcherJatos` for the given `userId`
2. Call `getOrGenerateJatosToken(researcherJatos.jatosUserId, String(userId))`
3. Fallback: if no `ResearcherJatos` exists, attempt `provisionResearcherJatos(userId)` first (lazy provisioning)
4. Last resort: return `process.env.JATOS_TOKEN` (degraded mode, logged as warning)

**Tests:**

- `getTokenForResearcher` returns JIT token for provisioned researcher
- `getTokenForResearcher` provisions lazily if `ResearcherJatos` missing
- Falls back to `JATOS_TOKEN` when provisioning fails

**Note:** Participant write operations (e.g. study code creation at join) use the service account token. The service account is a study member and has permission to create study codes. No `getTokenForStudy` or `getTokenForJatosStudyId` needed.

#### 4.2 Token Selection Guide

Token selection is based on **who is the actor**, not on the operation type:

| Actor                        | Token resolver                  | Used for                                                                                                                                                |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Researcher** (in session)  | `getTokenForResearcher(userId)` | All JATOS operations the researcher triggers — reads (viewing results, study properties) and writes (deleting studies, creating study codes for pilots) |
| **Participant** (in session) | `getServiceAccountToken()`      | All participant flows — reads (feedback, completion checks, dashboard) and writes (study code creation at join)                                         |
| **System / cron**            | `getServiceAccountToken()`      | Background reads and writes — status checks, scheduled reports                                                                                          |
| **Admin provisioning**       | `JATOS_TOKEN` (env var)         | Creating users, minting tokens, managing membership                                                                                                     |

**Batch requests:** A researcher's token works for all studies they're a member of. Researcher dashboard queries that aggregate across multiple studies can use a single `getTokenForResearcher(userId)` call — no need to split per-study. The service account token works for all studies it's a member of (which is all studies).

---

### Phase 5: Lib Function Updates — Done (Refactor)

**Current state:** All JATOS transport lives in `src/lib/jatos/client/*.ts`. Each client method **requires** `auth: JatosAuth` (no optional token). The call site (jatosAccessService or provisioning) resolves the token via tokenBroker and passes it.

**Pattern:** `client/*.ts` methods: `(params, auth: JatosAuth) => ...`. Token is always required.

**jatosAccessService** calls `getTokenForResearcher(userId)` or `getTokenForStudyService(studyId)` and passes the token to client methods. Provisioning uses `getAdminToken()` for admin-only calls.

**Removed in refactor:** `fetchHtmlFiles`, `fetchStudyAssets`, `fetchResultsBlob`, `downloadBlob`, `deleteExistingJatosStudy`, `createPersonalStudyCodeAndSave`, `fetchJatosBatchId`, `generateGeneralLinks`, `client.ts`.

---

### Phase 6: Call Site Updates

#### 6.1 Researcher-Initiated Call Sites

These are triggered by a researcher who is in session. They use `getTokenForResearcher(ctx.session.userId)` for **both reads and writes**. JATOS enforces that the researcher can only access studies they're a member of.

**Pattern:**

```ts
const token = await getTokenForResearcher(ctx.session.userId)
const metadata = await getResultsMetadata({ studyIds }, { token })
```

**Researcher study page views (reads):**

| File                                                                      | Operation                    |
| ------------------------------------------------------------------------- | ---------------------------- |
| `src/app/(app)/studies/queries/getStudyDataByComment.ts`                  | Read results metadata + data |
| `src/app/(app)/studies/[studyId]/utils/getPilotResultById.ts`             | Read results data            |
| `src/app/(app)/studies/[studyId]/utils/getAllPilotResults.ts`             | Read results metadata + data |
| `src/app/(app)/studies/[studyId]/inspector/*`                             | Various reads                |
| `src/app/(app)/studies/[studyId]/setup/step3/actions/checkPilotStatus.ts` | Read results metadata        |
| `src/app/(app)/studies/[studyId]/components/ResearcherData.tsx`           | Read results data            |
| `src/app/(app)/studies/[studyId]/actions/results.ts`                      | Read results data            |

**Researcher study page actions (writes):**

| File                                                          | Operation         |
| ------------------------------------------------------------- | ----------------- |
| `src/app/(app)/studies/[studyId]/setup/*` (pilot study codes) | Create study code |
| `src/app/api/jatos/delete-study/route.ts`                     | Delete study      |

**Researcher dashboard (aggregates across their studies):**

| File                                                                    | Operation                           |
| ----------------------------------------------------------------------- | ----------------------------------- |
| `src/app/(app)/studies/queries/getStudyMetadata.ts`                     | Read results metadata               |
| `src/app/(app)/dashboard/queries/getActiveStudiesWithResponseCounts.ts` | Read results metadata (multi-study) |

A single `getTokenForResearcher` call works for dashboard queries that span multiple studies, because the researcher's token covers all studies they're a member of.

#### 6.2 Participant-Initiated Call Sites

These are triggered by a participant who is in session. They use `getServiceAccountToken()` for reads.

**Pattern (reads and writes):**

```ts
const token = await getServiceAccountToken()
const metadata = await getResultsMetadata({ studyIds }, { token })
// Study code creation also uses getServiceAccountToken()
```

**Participant reads:**

| File                                                                             | Operation                           |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| `src/app/(app)/studies/[studyId]/feedback/actions/fetchParticipantFeedback.ts`   | Read results data                   |
| `src/app/(app)/studies/[studyId]/feedback/actions/checkParticipantCompletion.ts` | Read results metadata               |
| `src/app/(app)/dashboard/queries/getParticipantCompletedNotPaidStudies.ts`       | Read results metadata (multi-study) |
| `src/app/(app)/dashboard/queries/getParticipantStudyCounts.ts`                   | Read results metadata (multi-study) |
| `src/app/(app)/dashboard/queries/getParticipantIncompleteStudies.ts`             | Read results metadata (multi-study) |

**Participant writes (via service account):**

| File                                                   | Operation                  | Token resolution           |
| ------------------------------------------------------ | -------------------------- | -------------------------- |
| `src/app/api/jatos/create-personal-studycode/route.ts` | Create personal study code | `getServiceAccountToken()` |

#### 6.3 Shared Call Sites

Some call sites may be reached by both researcher and participant contexts. For these, the call site must determine the actor and resolve the appropriate token.

**Pattern:**

```ts
async function resolveJatosToken(session: Session, studyId?: number): Promise<string> {
  if (session.role === "RESEARCHER") {
    return getTokenForResearcher(session.userId)
  }
  return getServiceAccountToken()
}
```

If a specific query is shared between contexts, apply this pattern at the call site. The lib function itself remains token-agnostic.

#### 6.4 API Route Updates — Post-Refactor

**Current state:** All JATOS API routes except `import` have been removed. Researcher and participant flows use server actions that call `jatosAccessService` directly (Approach A). No routes proxy to JATOS for study data.

| Route                    | Status   | Notes                                                                                                                                            |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/jatos/import` | **Kept** | Sole exception. FormData upload. Calls `importJatosStudyForResearcher` which uses `getAdminToken()` for JATOS upload, then DB + membership sync. |
| All other routes         | Removed  | Replaced by `jatosAccessService` + server actions                                                                                                |

---

### Phase 7: Membership Sync

#### 7.1 StudyResearcher Lifecycle

When a researcher is added to or removed from a study, sync JATOS membership.

**Mutations that create `StudyResearcher`** (e.g., invite researcher, add collaborator):

- After creating `StudyResearcher`: get `jatosStudyId` from study's latest `JatosStudyUpload`
- If `jatosStudyId` exists: call `ensureResearcherJatosMember(userId, jatosStudyId)`

**Mutations that delete `StudyResearcher`** (e.g., remove researcher from study):

- Before/after delete: get `jatosStudyId`, call `removeResearcherFromJatosStudy(userId, jatosStudyId)`

**New file:** `src/lib/jatos/provisioning/removeResearcherFromJatosStudy.ts`

```ts
export async function removeResearcherFromJatosStudy(
  userId: number,
  jatosStudyId: number
): Promise<void>
```

- Gets researcher's `jatosUserId` from `ResearcherJatos`
- Calls `removeStudyMember({ studyId: jatosStudyId, userId: jatosUserId })`
- If researcher has no `ResearcherJatos`, no-op

#### 7.2 Service Account Membership at Import

**Current implementation:** `src/lib/jatos/provisioning/importJatosStudy.ts` already adds the service account as study member after researcher sync.

---

### Phase 8: Migration for Existing Data

#### 8.1 Provision Existing Researchers

**New script:** `scripts/provision-existing-researchers.ts`

1. Find all Users with role RESEARCHER who have at least one `StudyResearcher`
2. For each researcher without a `ResearcherJatos` record: call `provisionResearcherJatos(userId)`
3. For each researcher's studies: call `ensureResearcherJatosMember(userId, jatosStudyId)`
4. Log progress and errors

#### 8.2 Add Service Account to Existing Studies

**New script:** `scripts/provision-service-account-studies.ts`

1. Call `ensureServiceAccount()` to ensure the service account exists (creates it if missing, reads from `SystemConfig` if present)
2. Find all `JatosStudyUpload` records
3. For each: call `addStudyMember({ studyId: jatosStudyId, userId: serviceUserId })`
4. Log progress and errors

**Run order for existing deployments:**

1. Deploy new code (includes `SystemConfig` migration + startup `ensureServiceAccount`)
2. On first startup, `ensureServiceAccount` runs automatically — service account is created and stored in DB
3. `scripts/provision-existing-researchers.ts` — Provision researchers + membership
4. `scripts/provision-service-account-studies.ts` — Add service account to all existing studies

Add to `Makefile` or `package.json`:

```
provision-researchers        # Provision existing researchers
provision-service-studies    # Add service account to existing studies
```

**Note:** No separate service account creation step — it happens automatically at app startup.

---

### Phase 9: Documentation and Configuration

#### 9.1 Environment Variables

**Add to `.env.example` (if not already present):**

```env
# JATOS admin API token. Create via JATOS UI: login → API Tokens → New.
# Used only for provisioning (creating users, minting tokens, managing membership).
JATOS_TOKEN=

# Existing
JATOS_BASE=
JATOS_DOMAIN=
NEXT_PUBLIC_JATOS_BASE=
```

**Not needed:** `JATOS_SERVICE_USER_ID`, `JATOS_TOKEN_ENCRYPTION_KEY`, `JATOS_SERVICE_TOKEN` — the service account is provisioned automatically at startup and stored in `SystemConfig`. All tokens are JIT-generated and cached in memory.

#### 9.2 Docs

**Update:** `docs/JATOS_API_USAGE.md`

- Document three-token model (admin, researcher JIT, service account)
- Document strict token separation principle (actor determines token)
- Document token lifecycle (1-hour expiry, 55-min cache, JIT regeneration)
- Document service account setup and membership sync
- Document pending READER role change

**Update:** `DEPLOYMENT.md`

- Document that the service account is provisioned automatically at startup (no manual steps)
- Add migration steps for existing deployments (`provision-researchers`, `provision-service-studies`)

---

### Phase 10: Setup Safeguards

#### 10.1 Production Startup Guard

**New file:** `src/lib/startupGuards.ts`

```ts
export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return

  const UNSAFE = ["CHANGE_ME", "devpass", "dev-secret", "your-token", "your-secret", "LONGPASS"]

  const checks = [
    { name: "SESSION_SECRET_KEY", value: process.env.SESSION_SECRET_KEY },
    { name: "POSTGRES_PASSWORD", value: process.env.POSTGRES_PASSWORD },
    { name: "JATOS_TOKEN", value: process.env.JATOS_TOKEN },
  ]

  for (const { name, value } of checks) {
    if (!value?.trim()) {
      throw new Error(`[Startup] Missing required secret: ${name}.`)
    }
    const upper = value.toUpperCase()
    if (UNSAFE.some((u) => upper.includes(u))) {
      throw new Error(`[Startup] ${name} appears to use a default/placeholder value.`)
    }
  }
}
```

**Integration:** `instrumentation.ts` at project root (Next.js convention). Calls `assertProductionSecrets()` once on server start.

#### 10.2 Validation Script

**New file:** `scripts/validate-setup.ts`

| Check                                                          | Dev  | Production |
| -------------------------------------------------------------- | ---- | ---------- |
| `JATOS_BASE` set                                               | Yes  | Yes        |
| `JATOS_TOKEN` set and valid (call `/jatos/api/v1/admin/token`) | Yes  | Yes        |
| Service account in `SystemConfig` (key `jatosServiceUserID`)   | Warn | Yes        |
| `SESSION_SECRET_KEY` not placeholder                           | —    | Yes        |
| `POSTGRES_PASSWORD` not default                                | —    | Yes        |

**Makefile targets:**

```makefile
validate-setup:
	npx tsx scripts/validate-setup.ts

validate-token:
	# Existing: JATOS token validation only
```

#### 10.3 `.env.example` Comments

Add inline comments for each secret explaining what it is, how to generate it, and that it must be changed in production.

---

## Implementation Order

1. **Phase 3** — Service account setup (`SystemConfig` schema + `ensureServiceAccount` at startup + `serviceAccount.ts` + membership at import)
2. **Phase 4** — Token resolution (`getTokenForResearcher`; participant writes use `getServiceAccountToken`)
3. **Phase 5** — Add `token` parameter to all JATOS lib functions
4. **Phase 6** — Update call sites to pass appropriate token based on actor
5. **Phase 7** — Membership sync for `StudyResearcher` lifecycle + `removeResearcherFromJatosStudy`
6. **Phase 8** — Migration scripts for existing data
7. **Phase 9** — Documentation and configuration
8. **Phase 10** — Setup safeguards

Phases 1-2 are complete.

---

## Test Summary

| Component                        | Test Type   | Description                                                         |
| -------------------------------- | ----------- | ------------------------------------------------------------------- |
| `createJatosUser`                | Integration | DONE — Create user, verify response                                 |
| `createJatosUserToken`           | Integration | DONE — Create token, verify format                                  |
| `addStudyMember`                 | Integration | DONE — Add member to study                                          |
| `removeStudyMember`              | Integration | DONE — Remove member from study                                     |
| `provisionResearcherJatos`       | Integration | DONE — Full provisioning flow                                       |
| `ensureResearcherJatosMember`    | Integration | DONE — Provision + add member                                       |
| `tokenCache`                     | Unit        | DONE — Cache hit, miss, expiry                                      |
| `getServiceAccountToken`         | Unit        | DB lookup, in-memory cache, fallback to JATOS_TOKEN, JIT generation |
| `getTokenForResearcher`          | Unit        | Resolves researcher token, lazy provisioning, fallback              |
| Lib functions with token         | Unit        | Passed token is used in Authorization header                        |
| Service account at import        | Integration | Service account added as study member                               |
| `removeResearcherFromJatosStudy` | Integration | Remove member, no-op when not provisioned                           |
| Researcher call sites            | Integration | Researcher token used, JATOS rejects if not a member                |
| Participant call sites           | Integration | Service account token used                                          |
| Migration scripts                | Manual      | Run on staging                                                      |
| `startupGuards`                  | Unit        | Throws on placeholder, skips in dev                                 |
| `validate-setup` script          | Integration | Exit codes, output                                                  |

---

## Rollback Plan

If issues arise:

1. Lib functions fall back to `JATOS_TOKEN` when no token is provided — this is the current behavior
2. Call sites can be reverted to not pass token (one-line changes)
3. Service account membership is additive — removing it doesn't break studies
4. `ResearcherJatos` table can be left in place; it doesn't affect core functionality
5. `tokenCache.ts` can be bypassed by not calling `getOrGenerateJatosToken`

---

## Security Considerations

- **Admin token:** Restricted to provisioning. Never used to access study data. Consider renaming env var to `JATOS_ADMIN_TOKEN` for clarity.
- **Researcher tokens:** 1-hour expiry limits exposure window. JIT generation means tokens are never persisted to disk or database. JATOS enforces that researchers can only access studies they're members of, providing a second layer of access control beyond our app's authorization logic.
- **Service account:** Used only for participant flows where no researcher is in session. Read-only by convention (and by JATOS READER role once available). Added as member to each study — can be audited via JATOS member list.
- **Strict separation:** By always using the researcher's own token when they're in session, we ensure that an authorization bug in our app (e.g., a researcher accessing another researcher's study page) would be caught by JATOS's per-user access control.
- **Token in memory:** `tokenCache.ts` holds tokens in a `Map`. These are cleared on server restart. For serverless deployments, tokens may be regenerated more frequently (acceptable — admin token handles minting).
- **Audit:** Log provisioning events (userId, jatosUserId, timestamp) and membership changes.
- **Admin temporary access:** Admin can be temporarily added to a study via `addStudyMember` for emergency fixes, then removed via `removeStudyMember`.

---

## Removed from Original Plan

The following items from the original plan are no longer needed:

| Item                                           | Reason                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `encryptedJatosToken` on `ResearcherJatos`     | Tokens are JIT, not stored in DB                                              |
| `src/lib/jatos/tokenEncryption.ts`             | No encrypted token storage                                                    |
| `JATOS_TOKEN_ENCRYPTION_KEY` env var           | No encrypted token storage                                                    |
| `JATOS_SERVICE_TOKEN` env var                  | Service account token is JIT like researcher tokens                           |
| `JATOS_SERVICE_USER_ID` env var                | Service account ID stored in `SystemConfig`, provisioned at startup           |
| Batch request splitting (per-study)            | Researcher token covers all their studies; service account covers all studies |
| `getTokenForStudy` / `getTokenForJatosStudyId` | Not needed — participant writes use service account token                     |

---

## File Change Reference

### New Files

| Path                                                           | Purpose                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/lib/jatos/serviceAccount.ts`                              | `getServiceAccountToken()`, `getServiceAccountJatosUserId()` — JIT token + DB-backed user ID |
| `src/lib/jatos/provisioning/ensureServiceAccount.ts`           | Idempotent: create service account JATOS user, store in `SystemConfig`                       |
| `src/lib/jatos/getTokenForResearcher.ts`                       | Resolve current researcher's JIT token                                                       |
| `src/lib/jatos/provisioning/removeResearcherFromJatosStudy.ts` | Remove researcher from JATOS study members                                                   |
| `scripts/ensure-service-account.ts`                            | Startup script: calls `ensureServiceAccount()`, invoked from entrypoint                      |
| `scripts/provision-existing-researchers.ts`                    | Migration: provision existing researchers                                                    |
| `scripts/provision-service-account-studies.ts`                 | Migration: add service account to existing studies                                           |
| `src/lib/startupGuards.ts`                                     | Production secret assertions                                                                 |
| `instrumentation.ts`                                           | Calls `assertProductionSecrets()` on server start                                            |
| `scripts/validate-setup.ts`                                    | Pre-flight validation script                                                                 |

### Modified Files

| Path                                                                             | Change                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/jatos/api/getResultsMetadata.ts`                                        | Add `token` option                                                                                |
| `src/lib/jatos/api/getResultsData.ts`                                            | Add `token` option                                                                                |
| `src/lib/jatos/api/getStudyProperties.ts`                                        | Add `token` option                                                                                |
| `src/lib/jatos/api/fetchStudyCodes.ts`                                           | Add `token` option                                                                                |
| `src/lib/jatos/api/deleteStudy.ts`                                               | Add `token` option                                                                                |
| `src/lib/jatos/api/deleteExistingJatosStudy.ts`                                  | Add `token` option                                                                                |
| `src/lib/jatos/api/studyHasParticipantResponses.ts`                              | Add `token` option                                                                                |
| `src/lib/jatos/api/checkPilotCompletion.ts`                                      | Add `token` option                                                                                |
| `src/lib/jatos/api/fetchResultsBlob.ts`                                          | Add `token` option                                                                                |
| `src/lib/jatos/api/fetchHtmlFiles.ts`                                            | Add `token` option                                                                                |
| `src/lib/jatos/api/fetchStudyAssets.ts`                                          | Add `token` option                                                                                |
| `src/lib/jatos/api/getComponentMap.ts`                                           | Add `token` option                                                                                |
| `src/lib/jatos/api/downloadBlob.ts`                                              | Add `token` option (if it calls JATOS)                                                            |
| `src/app/(app)/studies/[studyId]/setup/mutations/importJatos.ts`                 | Add service account membership sync                                                               |
| Mutations that create `StudyResearcher`                                          | Call `ensureResearcherJatosMember`                                                                |
| Mutations that delete `StudyResearcher`                                          | Call `removeResearcherFromJatosStudy`                                                             |
| `src/app/api/jatos/get-results-metadata/route.ts`                                | Session-based token: researcher → `getTokenForResearcher`, participant → `getServiceAccountToken` |
| `src/app/api/jatos/get-results-data/route.ts`                                    | Same as above                                                                                     |
| `src/app/api/jatos/get-study-properties/route.ts`                                | Same as above                                                                                     |
| `src/app/api/jatos/get-study-code/route.ts`                                      | `getServiceAccountToken()`                                                                        |
| `src/app/api/jatos/get-all-results/route.ts`                                     | `getTokenForResearcher(session.userId)`                                                           |
| `src/app/api/jatos/get-asset-structure/route.ts`                                 | `getTokenForResearcher(session.userId)`                                                           |
| `src/app/api/jatos/create-personal-studycode/route.ts`                           | `getServiceAccountToken()`                                                                        |
| `src/app/api/jatos/delete-study/route.ts`                                        | `getTokenForResearcher(session.userId)`                                                           |
| `src/app/(app)/studies/queries/getStudyMetadata.ts`                              | Pass researcher token                                                                             |
| `src/app/(app)/studies/queries/getStudyDataByComment.ts`                         | Pass researcher token                                                                             |
| `src/app/(app)/studies/[studyId]/feedback/actions/fetchParticipantFeedback.ts`   | Pass service account token                                                                        |
| `src/app/(app)/studies/[studyId]/feedback/actions/checkParticipantCompletion.ts` | Pass service account token                                                                        |
| `src/app/(app)/studies/[studyId]/utils/getPilotResultById.ts`                    | Pass researcher token                                                                             |
| `src/app/(app)/studies/[studyId]/utils/getAllPilotResults.ts`                    | Pass researcher token                                                                             |
| `src/app/(app)/studies/[studyId]/inspector/*`                                    | Pass researcher token                                                                             |
| `src/app/(app)/studies/[studyId]/setup/step3/actions/checkPilotStatus.ts`        | Pass researcher token                                                                             |
| `src/app/(app)/studies/[studyId]/components/ResearcherData.tsx`                  | Pass researcher token                                                                             |
| `src/app/(app)/studies/[studyId]/actions/results.ts`                             | Pass researcher token                                                                             |
| `src/app/(app)/dashboard/queries/getActiveStudiesWithResponseCounts.ts`          | Pass researcher token                                                                             |
| `src/app/(app)/dashboard/queries/getParticipantCompletedNotPaidStudies.ts`       | Pass service account token                                                                        |
| `src/app/(app)/dashboard/queries/getParticipantStudyCounts.ts`                   | Pass service account token                                                                        |
| `src/app/(app)/dashboard/queries/getParticipantIncompleteStudies.ts`             | Pass service account token                                                                        |
| `db/schema.prisma`                                                               | Add `SystemConfig` model                                                                          |
| `docker-compose.yml`                                                             | Add `npx tsx scripts/ensure-service-account.ts` after migrations, before `npm run dev`            |
| `docker-compose.prod.yml`                                                        | Same startup step if prod uses custom command                                                     |
| `DEPLOYMENT.md`                                                                  | Document automatic service account provisioning, migration steps                                  |
| `docs/JATOS_API_USAGE.md`                                                        | Document three-token model, strict separation                                                     |
| `Makefile`                                                                       | Add `provision-*` and `validate-setup` targets                                                    |
