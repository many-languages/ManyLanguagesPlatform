# JATOS User-Scoped API Tokens Implementation Plan

## Overview

This plan describes how to migrate from using a single JATOS admin token for all operations to a defense-in-depth model where:

1. **Admin token** (`JATOS_TOKEN`) is used only for **provisioning**: creating JATOS users, minting tokens, adding/removing study members.
2. **User-scoped tokens** are stored per **researcher** (not per study), encrypted in our database in a separate `ResearcherJatos` table, and used for all study and results operations.
3. **Membership sync**: When a researcher is added to a study (`StudyResearcher`), we add their JATOS user as a study member. When removed, we remove them. Uses JATOS `PUT/DELETE /studies/{id}/members/{userId}`.
4. **Admin flexibility**: Admin can be temporarily added to a study via the members API for fixes, then removed—no extra token storage.

If our application ever has an authorization bug, a leaked researcher token would only expose studies that researcher is a member of—not the entire JATOS instance.

The JATOS API v1.1.0 (documented in `deploy/jatos/jatos-api.yaml`) provides the necessary endpoints:

- `POST /jatos/api/v1/users` – Create user (admin only)
- `POST /jatos/api/v1/users/{id}/tokens` – Generate API token (admin or self)
- `PUT /jatos/api/v1/studies/{id}/members/{userId}` – Add member to study
- `DELETE /jatos/api/v1/studies/{id}/members/{userId}` – Remove member

---

## Phase 1: Database and Encryption Foundation

### 1.1 Database Schema Changes

**File:** `db/schema.prisma`

Add new `ResearcherJatos` model (separate table for JATOS credentials—keeps `User` focused on identity):

```prisma
model ResearcherJatos {
  id                  Int    @id @default(autoincrement())
  userId              Int    @unique // 1:1 with User (researchers only)
  jatosUserId         Int // JATOS user ID (from POST /users)
  encryptedJatosToken String // AES-256-GCM encrypted API token

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  // ... existing fields ...
  researcherJatos ResearcherJatos? // optional 1:1, only researchers have this
}
```

**Migration:** Create migration `db/migrations/YYYYMMDDHHMMSS_researcher_jatos/migration.sql`

**Tests:**

- Migration applies cleanly
- Prisma client generates correct types
- `User` can have `researcherJatos` null (participants, admins)

---

### 1.2 Token Encryption Utility

**New file:** `src/lib/jatos/tokenEncryption.ts`

- `encryptToken(plaintext: string): string` – Returns `iv:tag:ciphertext` (base64)
- `decryptToken(encrypted: string): string` – Decrypts and returns plaintext
- Use Node `crypto` with `aes-256-gcm`
- Key from `process.env.JATOS_TOKEN_ENCRYPTION_KEY` (32-byte hex or base64)

**New env var:** `JATOS_TOKEN_ENCRYPTION_KEY` (add to `.env.example`, `DEPLOYMENT.md`)

**Tests:** `src/lib/jatos/tokenEncryption.test.ts`

- Encrypt then decrypt returns original
- Different IVs produce different ciphertext
- Invalid key/ciphertext throws
- Missing env throws

---

## Phase 2: JATOS Admin Provisioning API

### 2.1 Admin API Lib Functions

**New file:** `src/lib/jatos/api/admin/createJatosUser.ts`

- Calls `POST /jatos/api/v1/users` with admin token
- Body: `{ username, name, authMethod: "DB", password }` (password from secure random)
- Returns `{ id, username }` from response `data`

**New file:** `src/lib/jatos/api/admin/createJatosUserToken.ts`

- Calls `POST /jatos/api/v1/users/{id}/tokens` with admin token
- Body: `{ name: "mlp-researcher-{userId}" }`
- Returns `{ id, token }` – **token is only returned once**

**New file:** `src/lib/jatos/api/admin/addStudyMember.ts`

- Calls `PUT /jatos/api/v1/studies/{studyId}/members/{userId}` with admin token

**New file:** `src/lib/jatos/api/admin/removeStudyMember.ts`

- Calls `DELETE /jatos/api/v1/studies/{studyId}/members/{userId}` with admin token
- Used when a researcher is removed from a study (StudyResearcher deleted)

**Tests:** `src/lib/jatos/api/admin/*.test.ts` (integration tests, require JATOS)

- Create user returns valid id
- Create token returns non-empty token
- Add member succeeds for valid study/user
- Use `JATOS_BASE` and `JATOS_TOKEN` from env; skip if not configured

---

### 2.2 Provisioning Orchestration

**New file:** `src/lib/jatos/provisioning/provisionResearcherJatos.ts`

```ts
export async function provisionResearcherJatos(userId: number): Promise<{
  jatosUserId: number
}>
```

1. If `ResearcherJatos` already exists for user: return existing `jatosUserId` (idempotent)
2. Create JATOS user (username: `mlp-researcher-{userId}`, name: `MLP Researcher ${userId}`)
3. Store in `ResearcherJatos` (userId, jatosUserId)
4. Returns `{ jatosUserId }` for caller

Tokens are generated Just-In-Time via `getOrGenerateJatosToken` when API calls are made.

**Provisioning timing:** Lazy—when a researcher first needs JATOS access (e.g. when added to StudyResearcher, or when importing a study).

**Membership sync:** When a researcher is added to a study, we must add their JATOS user as a member. When removed, we remove them.

**File to update:** `src/app/(app)/studies/[studyId]/setup/mutations/importJatos.ts`

After creating/updating `JatosStudyUpload`:

- Get all researchers on the study (StudyResearcher records)
- For each researcher: call `ensureResearcherJatosMember(userId, jatosStudyId)` which:
  - If `User.researcherJatos` is null → provision (create JATOS user, store in ResearcherJatos)
  - Add researcher's `jatosUserId` to study via `PUT /studies/{id}/members/{jatosUserId}`

**Note:** At study creation (`createStudy`), only the PI is added—no JATOS study exists yet. Membership sync happens at import. Any future "add collaborator" mutation must call `ensureResearcherJatosMember` after creating StudyResearcher.

**New file:** `src/lib/jatos/provisioning/ensureResearcherJatosMember.ts`

```ts
export async function ensureResearcherJatosMember(
  userId: number,
  jatosStudyId: number
): Promise<void>
```

- If `ResearcherJatos` exists for user: add `jatosUserId` as member
- If not: call `provisionResearcherJatos(userId)` (creates JATOS user and stores in DB), then add as member

**StudyResearcher lifecycle:** When a researcher is added to or removed from a study, sync JATOS membership.

**Files to update:**
| Mutations that create `StudyResearcher` | After create: call `addResearcherToJatosStudy(userId, jatosStudyId)` |
| Mutations that delete `StudyResearcher` | Before/after delete: call `removeResearcherFromJatosStudy(userId, jatosStudyId)` |

**Helper:** `addResearcherToJatosStudy` / `removeResearcherFromJatosStudy` — ensure researcher has ResearcherJatos, then add/remove via members API.

**Admin temporary access:** To add admin to a study for fixes: get admin's JATOS user ID (e.g. from `GET /jatos/api/v1/admin/token` if it returns user metadata), call `PUT /studies/{id}/members/{adminJatosUserId}` with admin token, perform fix, then `DELETE` to remove.

**Tests:**

- `provisionResearcherJatos` integration test (with real JATOS)
- `ensureResearcherJatosMember` provisions when needed, adds member
- StudyResearcher create/delete triggers membership sync

---

## Phase 3: Token Resolution and Lib Function Updates

### 3.1 Token Resolution

**New file:** `src/lib/jatos/getTokenForStudy.ts`

```ts
export async function getTokenForStudy(studyId: number): Promise<string>
```

1. Find `StudyResearcher` for study with `user: { include: { researcherJatos: true } }`
2. Pick a researcher who has `researcherJatos` (prefer PI, then any)
3. If found: decrypt `encryptedJatosToken` and return
4. Else: return `process.env.JATOS_TOKEN` (fallback for studies with no provisioned researchers)

**New file:** `src/lib/jatos/getTokenForJatosStudyId.ts`

```ts
export async function getTokenForJatosStudyId(jatosStudyId: number): Promise<string>
```

1. Find `JatosStudyUpload` with `jatosStudyId` → get `studyId`
2. Call `getTokenForStudy(studyId)`

**New file:** `src/lib/jatos/getTokenForStudyUUID.ts`

```ts
export async function getTokenForStudyUUID(jatosStudyUUID: string): Promise<string>
```

1. Find `Study` with `jatosStudyUUID` → get `studyId`
2. Call `getTokenForStudy(studyId)`

**Note on batch requests:** `getResultsMetadata` and `getResultsData` can receive multiple `studyIds` (JATOS IDs). Each study may have a different token (from different researchers). The JATOS API accepts one `Authorization` header per request. Therefore, batch requests must be split into per-study requests, each using that study's token. Update callers (e.g. `getParticipantCompletedNotPaidStudies`) to make N parallel requests instead of one batched request.

**Tests:**

- `getTokenForStudy` returns decrypted token when a researcher has ResearcherJatos
- `getTokenForStudy` returns admin token when no provisioned researchers
- `getTokenForJatosStudyId` resolves correctly

---

### 3.2 Update Lib Functions to Accept Token

All lib functions that call JATOS must accept an optional `token` parameter. When provided, use it; otherwise use `JATOS_TOKEN` (backward compat).

**Pattern:**

```ts
// Before
const JATOS_TOKEN = process.env.JATOS_TOKEN!

// After
export async function getResultsMetadata(
  params: GetResultsMetadataParams,
  options?: { token?: string }
) {
  const token = options?.token ?? process.env.JATOS_TOKEN
  // ...
}
```

**Files to update:**

| File                                                | Change                                       |
| --------------------------------------------------- | -------------------------------------------- |
| `src/lib/jatos/api/getResultsMetadata.ts`           | Add `token` option                           |
| `src/lib/jatos/api/getResultsData.ts`               | Add `token` option                           |
| `src/lib/jatos/api/getStudyProperties.ts`           | Add `token` option                           |
| `src/lib/jatos/api/fetchStudyCodes.ts`              | Add `token` option                           |
| `src/lib/jatos/api/checkJatosStudyExists.ts`        | Keep admin only (provisioning)               |
| `src/lib/jatos/api/deleteStudy.ts`                  | Add `token` option                           |
| `src/lib/jatos/api/deleteExistingJatosStudy.ts`     | Add `token` option                           |
| `src/lib/jatos/api/studyHasParticipantResponses.ts` | Add `token` option (uses getResultsMetadata) |
| `src/lib/jatos/api/checkPilotCompletion.ts`         | Add `token` option                           |
| `src/lib/jatos/api/findStudyResultIdByComment.ts`   | No JATOS call (metadata only)                |
| `src/lib/jatos/api/fetchResultsBlob.ts`             | Add `token` option                           |
| `src/lib/jatos/api/matchJatosDataToMetadata.ts`     | No JATOS call                                |
| `src/lib/jatos/api/parseJatosZip.ts`                | No JATOS call                                |
| `src/lib/jatos/api/downloadBlob.ts`                 | Add `token` option (if it calls JATOS)       |
| `src/lib/jatos/api/fetchHtmlFiles.ts`               | Add `token` option                           |
| `src/lib/jatos/api/fetchStudyAssets.ts`             | Add `token` option                           |
| `src/lib/jatos/api/getComponentMap.ts`              | Add `token` option                           |
| `src/lib/jatos/api/generateGeneralLinks.ts`         | No token (builds URL only)                   |
| `src/lib/jatos/api/generateJatosRunUrl.ts`          | No token                                     |

**Keep admin-only (no token option):**

- `src/app/api/jatos/import/route.ts` – uses admin
- Admin provisioning libs – use admin

**Tests:** For each updated lib, add a test that verifies the function uses the passed token when provided (e.g. mock fetch and assert `Authorization: Bearer <token>`).

---

## Phase 4: Call Site Updates

### 4.1 Server-Side Callers

These call lib functions directly. They must resolve the token and pass it.

**Pattern:**

```ts
const token = await getTokenForStudy(studyId)
const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
```

**Files to update:**

| File                                                                             | Notes                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/app/(app)/studies/queries/getStudyMetadata.ts`                              | `fetchResultsMetadata` – get token for study                                    |
| `src/app/(app)/studies/queries/getStudyDataByComment.ts`                         | getResultsMetadata, getResultsData, findStudyResultIdByComment                  |
| `src/app/(app)/studies/[studyId]/feedback/actions/fetchParticipantFeedback.ts`   | getResultsData                                                                  |
| `src/app/(app)/studies/[studyId]/feedback/actions/checkParticipantCompletion.ts` | getResultsMetadata                                                              |
| `src/app/(app)/studies/[studyId]/utils/getPilotResultById.ts`                    | getResultsData                                                                  |
| `src/app/(app)/studies/[studyId]/utils/getAllPilotResults.ts`                    | getResultsMetadata, getResultsData                                              |
| `src/app/(app)/studies/[studyId]/inspector/*`                                    | Various                                                                         |
| `src/app/(app)/studies/[studyId]/codebook/queries/getCodebookData.ts`            | If uses JATOS                                                                   |
| `src/app/(app)/studies/[studyId]/variables/queries/getStudyVariables.ts`         | If uses JATOS                                                                   |
| `src/app/(app)/dashboard/queries/*`                                              | getActiveStudiesWithResponseCounts, getParticipantCompletedNotPaidStudies, etc. |
| `src/app/(app)/studies/[studyId]/setup/*`                                        | createPersonalStudyCodeAndSave, fetchStudyCodes, getStudyProperties, etc.       |

**createPersonalStudyCodeAndSave** uses `callJatosApi` which goes through `/api/jatos/create-personal-studycode`. That route uses `fetchStudyCodes` directly. So we need to change the flow: either the route receives `studyId` and resolves token, or we add a server-side path that passes token. The `createPersonalStudyCodeAndSave` is used from server actions – so we can have it call a lib function directly with token instead of going through the API route. Check usage.

**Files using createPersonalStudyCodeAndSave:**

- Participant join flow
- Researcher pilot link flow

These are server-side. So we can:

1. Change `createPersonalStudyCodeAndSave` to accept `token` and call `fetchStudyCodes` directly (bypass API route), OR
2. Keep API route but have it accept `studyId` in body, resolve token server-side, and call fetchStudyCodes with token.

Option 2 keeps the API route for potential client use. But the API route would need auth to verify the caller has access to the study. The current `create-personal-studycode` route doesn't take studyId – it takes jatosStudyId, jatosBatchId, etc. So the caller already has those. To get token we need studyId. We can derive studyId from jatosStudyId via JatosStudyUpload. So the route can:

- Receive jatosStudyId (and other params)
- Resolve studyId from jatosStudyId
- Verify caller has access (auth)
- Get token for study
- Call fetchStudyCodes with token

But `createPersonalStudyCodeAndSave` uses `callJatosApi` which hits our Next.js API route. So the API route is the one that needs to use the token. The route receives jatosStudyId – we can resolve token from that. So we need to update the API route to:

1. Get token via getTokenForJatosStudyId(jatosStudyId)
2. Call fetchStudyCodes with that token

But fetchStudyCodes is a server-side lib – the API route runs on server. So the route can import fetchStudyCodes, get the token, and call it. The route currently doesn't have auth – it's called from server via callJatosApi (which is fetch to our own API). So the "client" is actually our server (e.g. a Blitz mutation). The mutation has auth. So the flow is: Mutation (auth) -> callJatosApi (fetch to our API) -> API route. The API route doesn't have session because it's an internal fetch. So we need to either:

- Pass token in the request from the mutation (mutation has studyId, can get token, pass as header or body)
- Or have the mutation call fetchStudyCodes directly instead of going through the API route

The simpler approach: **Mutation calls fetchStudyCodes directly** with token. Then we don't need the API route for create-personal-studycode from server. But the route might be used from client too – need to check.

Looking at createPersonalStudyCodeAndSave – it uses callJatosApi which fetches our API. So the caller is always server (Blitz mutation). The API route is just a proxy. We could refactor so the mutation calls fetchStudyCodes directly with token, and remove the need for the create-personal-studycode route for this flow. Or we pass studyId in the request and the route resolves token. The route would need to trust the request – but it's our own server calling it. We could pass an internal secret or just pass the token. Passing token in body is simplest: add optional `token` to the request. If provided, use it; otherwise fall back to JATOS_TOKEN. The mutation would get token and pass it. So we need to update createPersonalStudyCodeAndSave to:

1. Accept studyId (or token) in options
2. If we have studyId, get token via getTokenForStudy
3. Call the API route with token in body (or a new server-only function that calls fetchStudyCodes directly)

Actually, the cleanest is: createPersonalStudyCodeAndSave is only used from server. So we can change it to call fetchStudyCodes directly instead of callJatosApi. It needs jatosStudyId, studyId (for token), batchId, type, comment. So we add studyId to the options and call fetchStudyCodes with token. No API route needed for this flow. The create-personal-studycode route might still be used from client – need to check. Grep for create-personal-studycode or createPersonalStudyCodeAndSave.

Actually createPersonalStudyCodeAndSave uses callJatosApi("/create-personal-studycode", ...) – so it always goes through the API route. The API route is the one that calls JATOS. So we need the API route to support token. The route receives jatosStudyId. We can add getTokenForJatosStudyId and pass token to fetchStudyCodes. But the route doesn't have auth – anyone could call it with any jatosStudyId. So we need to add auth to the route and verify the user has access to the study. That's a bigger change. For now, the plan can say: "API routes that take study IDs need auth and token resolution" – and we can implement that. The create-personal-studycode is called from our server (Blitz mutation) – the mutation has auth. So the request comes from an authenticated user. We need to pass the session to the API route – typically via cookies. Next.js API routes can use getSession from Blitz. So we add auth to the route, get studyId from jatosStudyId, verify user has access, get token, proceed. Good.

---

### 4.2 API Routes

API routes that proxy to JATOS need to:

1. Authenticate the request (session)
2. Resolve studyId from params (studyIds, jatosStudyId, etc.)
3. Verify user has access to the study
4. Get token for study
5. Call lib with token

**Files to update:**

| Route                       | Params                         | Auth | Token resolution                                 |
| --------------------------- | ------------------------------ | ---- | ------------------------------------------------ |
| `get-results-metadata`      | studyIds, studyUuids           | Yes  | From studyIds[0] or studyUuids→studyId           |
| `get-results-data`          | studyIds, studyResultIds, etc. | Yes  | From studyIds or studyResultIds→metadata→studyId |
| `get-study-properties`      | studyId                        | Yes  | From studyId                                     |
| `get-study-code`            | studyId                        | Yes  | From studyId                                     |
| `create-personal-studycode` | jatosStudyId, ...              | Yes  | jatosStudyId→studyId                             |
| `delete-study`              | id (UUID)                      | Yes  | id→studyId                                       |
| `get-all-results`           | body params                    | Yes  | studyIds→studyId                                 |
| `get-asset-structure`       | studyId                        | Yes  | From studyId                                     |

**Auth helper:** Create `src/lib/jatos/requireStudyAccess.ts` – given studyId, verify current session user has researcher/participant access. Use existing `verifyResearcherStudyAccess` or similar.

**Tests:**

- Each route returns 401 when unauthenticated
- Each route returns 403 when user lacks access
- Each route succeeds with valid token and access

---

## Phase 5: Import Flow, Membership Sync, and Migration

### 5.1 Import Mutation Update

**File:** `src/app/(app)/studies/[studyId]/setup/mutations/importJatos.ts`

After successful DB update (JatosStudyUpload created/updated):

- Get importing researcher's `userId` (from session; they must be a StudyResearcher)
- Call `ensureResearcherJatosMember(userId, jatosStudyId)` which:
  - Provisions researcher if needed (create JATOS user, mint token, store in ResearcherJatos)
  - Adds researcher's `jatosUserId` to study via `PUT /studies/{id}/members/{jatosUserId}`
- Handle errors (e.g. JATOS user creation fails) – log and optionally retry later

**Tests:**

- Import provisions researcher on first import (if not already provisioned)
- Import adds researcher as JATOS study member
- Import does not re-provision if researcher already has ResearcherJatos
- Import handles provisioning failure gracefully

---

### 5.2 StudyResearcher Membership Sync

When a researcher is added to or removed from a study, sync JATOS membership.

**Mutations that create StudyResearcher:** (e.g. invite researcher, add collaborator)

- After creating `StudyResearcher`: get `jatosStudyId` from study's latest JatosStudyUpload
- Call `ensureResearcherJatosMember(userId, jatosStudyId)` (provisions if needed, adds member)

**Mutations that delete StudyResearcher:** (e.g. remove researcher from study)

- Before/after delete: get `jatosStudyId`, call `removeResearcherFromJatosStudy(userId, jatosStudyId)`
- Uses `removeStudyMember` admin API

**New helper:** `src/lib/jatos/provisioning/removeResearcherFromJatosStudy.ts`

- Gets researcher's `jatosUserId` from ResearcherJatos
- Calls `DELETE /studies/{id}/members/{jatosUserId}` with admin token
- If researcher has no ResearcherJatos, no-op (they were never a member)

---

### 5.3 Migration for Existing Researchers

**New script:** `scripts/provision-existing-researcher-jatos.ts`

1. Find all Users with role RESEARCHER who have at least one StudyResearcher
2. For each: get their studies, get `jatosStudyId` from latest JatosStudyUpload per study
3. Call `ensureResearcherJatosMember(userId, jatosStudyId)` for each study
4. Log progress and errors

**Run manually** after deployment. Add to `Makefile` or `package.json` as `provision-researcher-jatos`.

**Tests:** Run against staging with a few test researchers.

---

## Phase 6: Documentation and Configuration

### 6.1 Environment Variables

**Add to `.env.example` and `DEPLOYMENT.md`:**

```
# Required for user-scoped tokens (32 bytes hex, e.g. openssl rand -hex 32)
JATOS_TOKEN_ENCRYPTION_KEY=

# Existing
JATOS_TOKEN=   # Admin token - used only for provisioning
JATOS_BASE=
```

### 6.2 Docs

**Update:** `docs/JATOS_API_USAGE.md`

- Document two-token model (admin vs researcher-scoped)
- Document researcher-level tokens (ResearcherJatos, membership sync)
- Document `getTokenForStudy` / `getTokenForJatosStudyId`
- Update "Future Enhancements" to reflect completion

**Update:** `DEPLOYMENT.md`

- Add migration steps for existing deployments
- Document `provision-existing-researcher-jatos` script
- Document admin temporary access (add/remove via members API)

---

## Phase 7: Setup Safeguards and Local MVP

This phase ensures the stack is **easy to test locally** while **safe by default** for production. MVP focuses on simple setup (`.env` + Docker); secrets manager integration is optional for advanced users.

### 7.1 Production Startup Guard

**New file:** `src/lib/startupGuards.ts`

Run at app startup (e.g. in `instrumentation.ts`, `next.config.js` instrumentation, or a shared bootstrap module):

```ts
export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return

  const UNSAFE = [
    "CHANGE_ME",
    "devpass",
    "dev-secret",
    "your-token",
    "your-secret",
    "LONGPASS", // common placeholder from README_install
  ]

  const checks: { name: string; value: string | undefined }[] = [
    { name: "SESSION_SECRET_KEY", value: process.env.SESSION_SECRET_KEY },
    { name: "POSTGRES_PASSWORD", value: process.env.POSTGRES_PASSWORD },
    { name: "JATOS_TOKEN", value: process.env.JATOS_TOKEN },
  ]

  for (const { name, value } of checks) {
    if (!value?.trim()) {
      throw new Error(
        `[Startup] Missing required secret: ${name}. Set it in .env before running in production.`
      )
    }
    const upper = value.toUpperCase()
    if (UNSAFE.some((u) => upper.includes(u))) {
      throw new Error(
        `[Startup] ${name} appears to use a default/placeholder value. Change it before running in production.`
      )
    }
  }
}
```

**Integration:** Create `instrumentation.ts` at project root (Next.js convention). Export `register()` which calls `assertProductionSecrets()`. Next.js runs this once when the server starts. See [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation).

**Behavior:** In `NODE_ENV=development`, no checks run. In production, app refuses to start with missing or placeholder secrets.

**Tests:** Unit test that throws on placeholder, passes on valid value, skips in development.

---

### 7.2 Validation Script

**New Makefile target:** `make validate-setup`

**New script:** `scripts/validate-setup.js` (or `.ts` if preferred)

Checks (exit 1 on failure, print clear message):

| Check                                                           | Dev | Production                          |
| --------------------------------------------------------------- | --- | ----------------------------------- |
| `JATOS_BASE` set                                                | ✓   | ✓                                   |
| `JATOS_TOKEN` set and non-empty                                 | ✓   | ✓                                   |
| `JATOS_TOKEN` valid (call `/jatos/api/v1/admin/token`)          | ✓   | ✓                                   |
| `SESSION_SECRET_KEY` set                                        | ✓   | ✓                                   |
| `SESSION_SECRET_KEY` not placeholder                            | —   | ✓                                   |
| `JATOS_TOKEN_ENCRYPTION_KEY` set (32+ chars)                    | —   | ✓ (when user-scoped tokens enabled) |
| `POSTGRES_PASSWORD` not default                                 | —   | ✓                                   |
| `NEXT_PUBLIC_JATOS_BASE` matches `JATOS_DOMAIN` (or consistent) | —   | Warn                                |

**Usage:**

```bash
make validate-setup      # Full validation
make validate-token      # Existing: JATOS token only
```

**Tests:** Script exits 0 when env is valid, 1 when invalid; output is parseable.

---

### 7.3 Clear `.env.example` Comments

**File:** `.env.example`

Add inline comments for each secret explaining:

- What it is
- How to generate (e.g. `openssl rand -hex 32` for `SESSION_SECRET_KEY`)
- That it must be changed in production

Example:

```env
# Session encryption. Generate: openssl rand -hex 32
# MUST change before production.
SESSION_SECRET_KEY=CHANGE_ME_IN_PRODUCTION

# JATOS admin API token. Create via JATOS UI: login → API Tokens → New.
# Used only for provisioning (creating user-scoped tokens).
JATOS_TOKEN=

# Required for encrypting user-scoped JATOS tokens in DB. Generate: openssl rand -hex 32
JATOS_TOKEN_ENCRYPTION_KEY=
```

---

### 7.4 Tiered Setup Documentation

**Quick start (local MVP):**

1. `cp .env.example .env`
2. Edit `.env`: set `JATOS_TOKEN` (create via JATOS UI after first `make dev`)
3. `make dev`
4. `make validate-setup` (optional but recommended)

**Production checklist** (add to `DEPLOYMENT.md` or `docs/SELF_HOSTING.md`):

- [ ] All passwords changed from defaults
- [ ] `SESSION_SECRET_KEY` generated (not placeholder)
- [ ] `JATOS_TOKEN` created and set
- [ ] `JATOS_TOKEN_ENCRYPTION_KEY` generated (for user-scoped tokens)
- [ ] `make validate-setup` passes
- [ ] HTTPS configured (Traefik/Let's Encrypt)
- [ ] `CRON_SECRET` set for study status scheduler

---

### 7.5 MVP Scope: No Secrets Manager Required

For MVP and local testing:

- **Secrets:** `.env` file only
- **No** AWS Secrets Manager, Vault, or other external secrets store
- **Optional later:** Document how to use Secrets Manager for production (e.g. fetch secrets at container start, write to env)

---

### 7.6 Files to Add/Update

| Path                        | Change                                           |
| --------------------------- | ------------------------------------------------ |
| `src/lib/startupGuards.ts`  | New: production secret assertions                |
| `scripts/validate-setup.js` | New: pre-flight validation script                |
| `Makefile`                  | Add `validate-setup` target                      |
| `.env.example`              | Add comments for each secret                     |
| `DEPLOYMENT.md`             | Add production checklist, link to validate-setup |
| App entrypoint              | Call `assertProductionSecrets()` on startup      |

**Tests:**

- `startupGuards` unit tests
- `validate-setup` script tests (mock env, assert exit codes)

---

## Implementation Order

1. **Phase 1** – Schema + encryption (no behavior change)
2. **Phase 2** – Admin provisioning libs + orchestration
3. **Phase 3** – Token resolution + lib function signature updates
4. **Phase 4** – Call site updates (server + API routes with auth)
5. **Phase 5** – Import flow + migration script
6. **Phase 6** – Docs and config
7. **Phase 7** – Setup safeguards (startup guard, validate-setup, .env comments, production checklist)

---

## Test Summary

| Component                     | Test Type        | Description                                     |
| ----------------------------- | ---------------- | ----------------------------------------------- |
| `tokenEncryption`             | Unit             | Encrypt/decrypt roundtrip, error cases          |
| `createJatosUser`             | Integration      | Create user, verify response                    |
| `createJatosUserToken`        | Integration      | Create token, verify format                     |
| `addStudyMember`              | Integration      | Add member to study                             |
| `removeStudyMember`           | Integration      | Remove member from study                        |
| `provisionResearcherJatos`    | Integration      | Full provisioning flow                          |
| `ensureResearcherJatosMember` | Integration      | Provision + add member                          |
| StudyResearcher create/delete | Integration      | Membership sync triggers                        |
| `getTokenForStudy`            | Unit             | Resolved vs fallback                            |
| `getTokenForJatosStudyId`     | Unit             | Resolution from jatosStudyId                    |
| Lib functions with token      | Unit             | Passed token is used                            |
| API routes                    | Integration      | Auth, 403, success with token                   |
| `importJatos` mutation        | Integration      | Provision researcher + add as member            |
| Migration script              | Manual           | Run on staging (provision existing researchers) |
| `startupGuards`               | Unit             | Throws on placeholder, skips in dev             |
| `validate-setup` script       | Unit/Integration | Exit codes, output                              |

---

## Rollback Plan

If issues arise:

1. Lib functions fall back to `JATOS_TOKEN` when token is not provided
2. Call sites can be reverted to not pass token
3. `ResearcherJatos` table can be dropped; no impact on core User/Study data
4. Remove provisioning from import/membership sync to fully rollback

---

## Security Considerations

- **Encryption key:** Store `JATOS_TOKEN_ENCRYPTION_KEY` in secrets manager; rotate periodically (requires re-encrypting tokens)
- **Token in memory:** Minimize exposure; clear after use where possible
- **Admin token:** Restrict `JATOS_TOKEN` to provisioning; consider separate env var `JATOS_ADMIN_TOKEN` for clarity
- **Audit:** Log provisioning events (userId, jatosUserId, timestamp) and membership changes
- **Admin temporary access:** Document how to add admin to a study via members API for emergency fixes, then remove

---

## File Change Reference

### New Files

| Path                                                           | Purpose                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/jatos/tokenEncryption.ts`                             | Encrypt/decrypt tokens                                     |
| `src/lib/jatos/tokenEncryption.test.ts`                        | Unit tests                                                 |
| `src/lib/jatos/api/admin/createJatosUser.ts`                   | Create JATOS user                                          |
| `src/lib/jatos/api/admin/createJatosUserToken.ts`              | Mint token for user                                        |
| `src/lib/jatos/api/admin/addStudyMember.ts`                    | Add user as study member                                   |
| `src/lib/jatos/api/admin/removeStudyMember.ts`                 | Remove user from study                                     |
| `src/lib/jatos/provisioning/provisionResearcherJatos.ts`       | Provision researcher (create user, mint token, store)      |
| `src/lib/jatos/provisioning/ensureResearcherJatosMember.ts`    | Ensure researcher has JATOS user + add as study member     |
| `src/lib/jatos/provisioning/removeResearcherFromJatosStudy.ts` | Remove researcher from JATOS study members                 |
| `src/lib/jatos/getTokenForStudy.ts`                            | Resolve token via StudyResearcher → User → ResearcherJatos |
| `src/lib/jatos/getTokenForJatosStudyId.ts`                     | Resolve token by JATOS study ID                            |
| `src/lib/jatos/getTokenForStudyUUID.ts`                        | Resolve token by JATOS study UUID                          |
| `src/lib/jatos/requireStudyAccess.ts`                          | Auth helper for API routes                                 |
| `scripts/provision-existing-researcher-jatos.ts`               | Migration for existing researchers                         |
| `db/migrations/YYYYMMDDHHMMSS_researcher_jatos/migration.sql`  | Schema migration (ResearcherJatos table)                   |
| `src/lib/startupGuards.ts`                                     | Production secret assertions                               |
| `instrumentation.ts`                                           | Calls `assertProductionSecrets()` on server start          |
| `scripts/validate-setup.js`                                    | Pre-flight validation script                               |

### Modified Files

| Path                                                                             | Change                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `db/schema.prisma`                                                               | Add `ResearcherJatos` model, add `researcherJatos` relation to User |
| `src/lib/jatos/api/getResultsMetadata.ts`                                        | Add token option                                                    |
| `src/lib/jatos/api/getResultsData.ts`                                            | Add token option                                                    |
| `src/lib/jatos/api/getStudyProperties.ts`                                        | Add token option                                                    |
| `src/lib/jatos/api/fetchStudyCodes.ts`                                           | Add token option                                                    |
| `src/lib/jatos/api/deleteStudy.ts`                                               | Add token option                                                    |
| `src/lib/jatos/api/deleteExistingJatosStudy.ts`                                  | Add token option                                                    |
| `src/lib/jatos/api/studyHasParticipantResponses.ts`                              | Add token option                                                    |
| `src/lib/jatos/api/checkPilotCompletion.ts`                                      | Add token option                                                    |
| `src/lib/jatos/api/fetchResultsBlob.ts`                                          | Add token option                                                    |
| `src/lib/jatos/api/fetchHtmlFiles.ts`                                            | Add token option                                                    |
| `src/lib/jatos/api/fetchStudyAssets.ts`                                          | Add token option                                                    |
| `src/lib/jatos/api/getComponentMap.ts`                                           | Add token option                                                    |
| `src/app/(app)/studies/[studyId]/setup/mutations/importJatos.ts`                 | Call ensureResearcherJatosMember after import                       |
| Mutations that create StudyResearcher                                            | Call ensureResearcherJatosMember after create                       |
| Mutations that delete StudyResearcher                                            | Call removeResearcherFromJatosStudy before/after delete             |
| `src/app/api/jatos/get-results-metadata/route.ts`                                | Auth + token resolution                                             |
| `src/app/api/jatos/get-results-data/route.ts`                                    | Auth + token resolution                                             |
| `src/app/api/jatos/get-study-properties/route.ts`                                | Auth + token resolution                                             |
| `src/app/api/jatos/get-study-code/route.ts`                                      | Auth + token resolution                                             |
| `src/app/api/jatos/create-personal-studycode/route.ts`                           | Auth + token resolution                                             |
| `src/app/api/jatos/delete-study/route.ts`                                        | Auth + token resolution                                             |
| `src/app/api/jatos/get-all-results/route.ts`                                     | Auth + token resolution                                             |
| `src/app/api/jatos/get-asset-structure/route.ts`                                 | Auth + token resolution                                             |
| `src/app/(app)/studies/queries/getStudyMetadata.ts`                              | Pass token                                                          |
| `src/app/(app)/studies/queries/getStudyDataByComment.ts`                         | Pass token                                                          |
| `src/app/(app)/studies/queries/getParticipantStudiesWithStatus.ts`               | Per-study requests + token                                          |
| `src/app/(app)/studies/[studyId]/feedback/actions/fetchParticipantFeedback.ts`   | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/feedback/actions/checkParticipantCompletion.ts` | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/utils/getPilotResultById.ts`                    | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/utils/getAllPilotResults.ts`                    | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/inspector/utils/getValidationData.ts`           | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/setup/mutations/checkJatosStudyUuid.ts`         | Pass token (or keep admin for pre-import check)                     |
| `src/app/(app)/studies/[studyId]/setup/step3/actions/checkPilotStatus.ts`        | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/components/ResearcherData.tsx`                  | Pass token                                                          |
| `src/app/(app)/studies/[studyId]/components/client/ResultsCardWrapper.tsx`       | Pass token (or use server action)                                   |
| `src/app/(app)/studies/[studyId]/actions/results.ts`                             | Pass token                                                          |
| `src/app/(app)/dashboard/queries/getActiveStudiesWithResponseCounts.ts`          | Per-study requests + token                                          |
| `src/app/(app)/dashboard/queries/getParticipantCompletedNotPaidStudies.ts`       | Per-study requests + token                                          |
| `src/app/(app)/dashboard/queries/getParticipantStudyCounts.ts`                   | Per-study requests + token                                          |
| `src/app/(app)/dashboard/queries/getParticipantIncompleteStudies.ts`             | Per-study requests + token                                          |
| `.env.example`                                                                   | Add JATOS_TOKEN_ENCRYPTION_KEY                                      |
| `DEPLOYMENT.md`                                                                  | Document new env, migration steps                                   |
| `docs/JATOS_API_USAGE.md`                                                        | Document two-token model                                            |
| `Makefile`                                                                       | Add `validate-setup` target                                         |
| App entrypoint                                                                   | Call `assertProductionSecrets()` on startup                         |
