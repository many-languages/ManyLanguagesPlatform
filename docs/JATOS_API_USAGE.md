# JATOS API Usage Guidelines

## Overview

This document describes how JATOS integration works after the refactor. The architecture uses **server-only integration**: mutations, server actions, and queries call JATOS via `jatosAccessService` directly. There is **one deliberate exception**: the import route for FormData uploads.

---

## Architecture

### Layers

```
Mutation / Server Action / Query
    ↓
jatosAccessService (use-case API)
    → assertResearcherCanAccessStudy / assertParticipantCanAccessStudy
    → tokenBroker.getTokenForResearcher(userId) / getTokenForStudyService(studyId)
    → jatosClient.method(params, auth)
    ↓
jatosClient (client/*.ts) — auth-injected, transport-only
    → Single JATOS HTTP request per method
    → Requires JatosAuth { token: string }
    ↓
tokenBroker — token resolution only
    → getTokenForResearcher(userId)
    → getTokenForStudyService(studyId)
    → getAdminToken() — provisioning only
```

### Feedback helpers (`src/features/feedback/domain/`)

Feedback template rendering and cohort aggregation for `stat:…:across` live under **`src/features/feedback/domain/`** so **`jatosAccessService` does not import from `src/app/**`**. Import via `@/src/features/feedback/domain/...`.

| Module                                 | Role                                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderTypes`, `feedbackRenderContext` | `FeedbackRenderContext`, `Primitive`, `FeedbackRenderBundleInput`; `buildFeedbackRenderContext`                                                                                  |
| `requiredVariableNames`                | `extractRequiredVariableNames`, `buildRequiredKeysHash`                                                                                                                          |
| `statAcrossKeys`                       | `statAcrossLookupKey`; `templateUsesStatAcross` (uses `createFeedbackStatPlaceholderRegex` from `feedbackStatPlaceholder.ts` so “uses across” matches render/DSL)                |
| `variableRowAggregation`               | `collectVariableValuesAcrossAllRows`, `buildPredicate` (where-clauses)                                                                                                           |
| `computeAggregatedAcrossStats`         | `computeAggregatedAcrossStatsForTemplate` — used inside `getParticipantFeedback` when the template uses `stat:…:across`, and for researcher static feedback                      |
| `extractVariableBundleForRender`       | Re-exports `extractVariableBundleForRenderFromResults` from the study **variables** module — single supported import path for JATOS-facing code (no direct `src/app/**` imports) |

### Key Principles

- **No API routes for JATOS** — except the import route (see below).
- **No direct `client/*` imports** — App code must not import from `src/lib/jatos/client/*`. Use `jatosAccessService` for all JATOS operations. The sole exception is `browser/uploadStudyFile` for FormData uploads.
- **Use-case API** — Call `jatosAccessService.*ForResearcher` or `*ForParticipant`, not low-level client methods.
- **Narrow inputs** — Pass `userId`, `studyId`, `pseudonym`, etc., not session objects.
- **Bind JATOS IDs to app studies** — If a caller supplies `jatosStudyId`, `jatosStudyUploadId`, or `jatosStudyUUID`, the service must verify it belongs to the authorized app `studyId` before resolving a token or making a JATOS call.
- **Token separation** — `getAdminToken()` is never called by jatosAccessService; only provisioning uses it.

### App vs JATOS Separation

- **withStudyAccess** — App-level access helper. Handles session + researcher DB access. Does NOT resolve tokens or call JATOS. Use for DB-only flows and for mixed flows when early app-level authorization is needed.
- **jatosAccessService** — JATOS integration layer. Resolves tokens, binds JATOS identifiers back to app studies, then calls JATOS. App code must not bypass it.
- **Mixed flows** — A mutation may use `withStudyAccess` for app-level auth, do DB work, then call `jatosAccessService` for JATOS. This is acceptable. Duplicated access checks (in both layers) preserve clean responsibility boundaries.

### App Study / JATOS Study Binding

Authorization must be checked against the app model before JATOS calls:

1. Authenticate the actor (`userId` from the session).
2. Authorize the actor against the app `studyId` or `ParticipantStudy`.
3. Verify any supplied JATOS identifier belongs to that same app study:
   - `jatosStudyId` -> `JatosStudyUpload.studyId`
   - `jatosStudyUploadId` -> `JatosStudyUpload.studyId`
   - `jatosStudyUUID` -> `Study.jatosStudyUUID`
4. Resolve the JATOS token and call JATOS only after those checks pass.

Prefer resolving `jatosStudyId` from `studyId` server-side. If a client surface
passes a JATOS identifier for UI convenience, treat it as untrusted input and
re-bind it in `jatosAccessService` or a feature server helper before use.

The setup UUID validation flow is the narrow exception: it may query JATOS for a
candidate UUID before that UUID is linked to the app study. Keep that exception
inside `checkJatosStudyUuidForSetup`; do not generalize it to normal researcher
or participant reads.

### Architecture Violations (avoid)

- Direct app import of `src/lib/jatos/client/*` (exception: `browser/uploadStudyFile`)
- Direct app import of `getAdminToken` (from `getAdminToken` or `tokenBroker`)
- Direct app import of token resolution (`getTokenForResearcher`, `getTokenForStudyService`, `getServiceAccountToken`) from `tokenBroker`
- Direct app import of provisioning helpers where a facade exists (`jatosAccessService`, `tokenBroker`)

**Validation**: Run `npm run validate:jatos-architecture` to check app code for these violations.

---

## Participant Token Policy

Participant authentication is validated at the app layer. Participant flows split into two token paths:

| Path  | Helper                                    | Token Source             | Use Cases                            |
| ----- | ----------------------------------------- | ------------------------ | ------------------------------------ |
| Read  | `withParticipantViewerToken`              | Service account (VIEWER) | Feedback, completion check, metadata |
| Write | `withParticipantAccessAndResearcherToken` | Researcher (USER)        | Study code creation only             |

VIEWER is used only for participant-facing read flows in our app. Study code creation uses a researcher token because JATOS requires USER for `POST /studyCodes`. This is intentional delegated researcher authority — do not merge these paths.

Both participant token paths verify:

- the authenticated `userId` owns the `ParticipantStudy` for the app `studyId`,
- the supplied `pseudonym` matches that participant row,
- the supplied `jatosStudyId` belongs to the same app `studyId`,
- and, when present, `participantStudyId` matches the same authenticated row.

This prevents a caller from combining an authorized app study with a different
imported JATOS study or saving a generated run URL onto another participant row.

The service account is also used by narrow platform lifecycle/admin checks such
as `checkStudyParticipantResponsePresence`, where there is no researcher or
participant actor and destructive operations must fail closed if JATOS cannot
be checked.

**Researcher selection** (for study code creation): PI first, then COLLABORATOR, then VIEWER (ResearcherRole), then earliest `createdAt`, then smallest `userId`.

---

## Sole API Route Exception: Import

### POST /api/jatos/import

**Purpose**: Import a JATOS study file (.jzip). FormData upload requires a route handler; server actions cannot accept `File` or `FormData` directly.

**Location**: `src/app/api/jatos/import/route.ts`

**FormData fields**:

| Field             | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `studyFile`       | File   | Yes      | The .jzip file to upload   |
| `studyId`         | number | Yes      | App study ID               |
| `jatosWorkerType` | string | Yes      | `"SINGLE"` or `"MULTIPLE"` |

**Flow**:

1. Route receives FormData, validates file (.jzip, 100MB limit).
2. Resolves session via `getBlitzContext()`.
3. Calls `importJatosStudyForResearcher` from `provisioning/importJatosStudy.ts`.
4. Service: computes build hash → uploads to JATOS → updates DB → syncs membership.
5. Returns full import result (jatosStudyId, jatosStudyUUID, latestUpload, etc.).

**Browser usage** (sole exception: app may import from `browser/` for FormData; never from `client/*`):

```typescript
import { uploadStudyFile } from "@/src/lib/jatos/browser/uploadStudyFile"

const result = await uploadStudyFile(file, {
  studyId: study.id,
  jatosWorkerType: "SINGLE",
})
// result includes jatosStudyId, jatosStudyUUID, latestUpload, etc.
```

**Rationale**: Large .jzip files (up to 100MB), FormData handling, and Blitz RPC JSON serialization constraints make a dedicated route the practical choice. All business logic lives in the service layer; the route is a thin transport boundary.

---

## Usage Patterns

### Researcher Flows

Use `jatosAccessService` methods that end in `ForResearcher`:

```typescript
import {
  getResultsMetadataForResearcher,
  getStudyPropertiesForResearcher,
  downloadAllResultsForResearcher,
  getBatchIdForResearcher,
  getParticipantFeedback, // participant read flow, uses getTokenForStudyService
} from "@/src/lib/jatos/jatosAccessService"

// Server component or action
const metadata = await getResultsMetadataForResearcher({ studyId, userId })
const payload = await downloadAllResultsForResearcher({ studyId, userId })
```

### Participant Flows

Use `getParticipantFeedback` (participant read path via `withParticipantViewerToken` / study service token — see Participant Token Policy). You must pass **`templateContent`** so the service can decide whether to fetch only the participant’s result or the full study (for template-driven `stat:…:across` aggregates). Optionally pass **`requiredVariableKeyList`** to narrow extraction.

```typescript
const result = await getParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  participantStudyId,
  userId,
  templateContent,
  requiredVariableKeyList,
})
// result.data: { enrichedResult, aggregatedAcrossStats? } — never raw cohort arrays
```

`participantStudyId` is optional for compatibility, but pass it when available.
It gives the service one more deterministic check before any participant JATOS
read/write path runs.

### Server Actions

Extract `userId` from session and call the service:

```typescript
"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { downloadAllResultsForResearcher } from "@/src/lib/jatos/jatosAccessService"

export async function downloadResultsAction(studyId: number) {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) return { success: false, error: "Not authenticated" }

  const payload = await downloadAllResultsForResearcher({ studyId, userId })
  return { success: true, payload }
}
```

---

## Available Service Methods

| Method                                      | Use Case                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `getResultsMetadataForResearcher`           | Fetch results metadata                                                                 |
| `getResultsMetadataForParticipantDashboard` | Fetch participant-dashboard result metadata without exposing tokens                    |
| `getResultsMetadataForResearcherDashboard`  | Fetch researcher-dashboard response metadata                                           |
| `checkStudyParticipantResponsePresence`     | Check participant response presence for platform lifecycle/admin decisions             |
| `checkParticipantCompletionForParticipant`  | Check participant completion from metadata                                             |
| `getStudyPropertiesForResearcher`           | Fetch study properties                                                                 |
| `getBatchIdForResearcher`                   | Get first batch ID from properties                                                     |
| `checkJatosStudyUuidForSetup`               | Validate a setup-time JATOS study UUID                                                 |
| `ensureResearcherStudyMembership`           | Ensure a researcher is provisioned as a JATOS study member                             |
| `downloadAllResultsForResearcher`           | Download all results as `DownloadPayload`                                              |
| `getParticipantFeedback`                    | Participant feedback (viewer token); template-driven cohort aggregates in-service only |
| `createPersonalStudyCodeForParticipant`     | Join study (participant; uses researcher token)                                        |
| `createPersonalStudyCodeForResearcher`      | Pilot link (researcher)                                                                |
| `getGeneralLinksForResearcher`              | General links for participants                                                         |
| `getEnrichedResultsForResearcher`           | Enriched results for researcher display                                                |
| `getHtmlFilesForResearcher`                 | HTML files from asset structure                                                        |
| `getStudyDataByCommentForResearcher`        | Study data by comment (e.g. "test")                                                    |
| `getAllPilotResultsForResearcher`           | All pilot results                                                                      |
| `getPilotResultByIdForResearcher`           | Single pilot result by ID                                                              |
| `checkPilotStatusForResearcher`             | Pilot completion status                                                                |

---

## Error Handling

**`jatosAccessService`** throws when app-level authorization fails or when a JATOS call fails after a token is resolved. Callers must not assume success without `try/catch` (or equivalent) at boundaries that return data to the UI, HTTP clients, or server actions.

### Typed errors (HTTP & transport)

Low-level JATOS HTTP helpers under `src/lib/jatos/client/*` use **`throwIfJatosError`** ([`throwIfJatosError.ts`](../src/lib/jatos/client/throwIfJatosError.ts)): failed responses become subclasses of **`JatosApiError`** ([`errors.ts`](../src/lib/jatos/errors.ts)) — e.g. **`JatosUnauthorizedError`**, **`JatosForbiddenError`**, **`JatosNotFoundError`**, **`JatosBadRequestError`**, or a generic **`JatosApiError`** for other status codes. Network and parse failures surface as **`JatosTransportError`** (includes an `operation` string for correlation).

App code must **not** import `client/*` directly (except the documented browser upload helper); this typing still applies because **`jatosAccessService`** ultimately uses those clients.

### User-facing messages (safe)

**Do not** return **`error.message`** (or raw JATOS body text) to browsers, toast copy, or public JSON as a default. Those strings can leak operational detail or inconsistent vendor wording.

For participant- and researcher-facing surfaces, use **`mapJatosErrorToUserMessage(error)`** from [`src/lib/jatos/errors.ts`](../src/lib/jatos/errors.ts). It maps typed JATOS errors to **stable, generic** copy and falls back to a safe default for unknown errors. Feature server actions and loaders (e.g. participant feedback, pilot status, cleaned download) follow this pattern.

```typescript
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"

try {
  const data = await getResultsMetadataForResearcher({ studyId, userId })
  return { success: true, data }
} catch (error: unknown) {
  return { success: false, error: mapJatosErrorToUserMessage(error) }
}
```

**Blitz** errors (e.g. **`AuthorizationError`**, **`NotFoundError`**) from app guards are **not** JATOS types: they are handled per route conventions (see [Server component patterns](./SERVER_COMPONENT_PATTERNS.md)). If a catch block might see both, map JATOS failures for the client and **rethrow** — or translate — Blitz errors according to that layer’s contract.

### Server-only logging and debugging

For operator visibility, prefer **`logJatosError`** / **`sanitizeJatosLogContext`** from [`src/lib/jatos/logger.ts`](../src/lib/jatos/logger.ts): structured, **sanitized** context (category, status, code, operation) without treating client responses as a log sink.

Full internal messages remain on the **`Error`** objects thrown inside the server; keep them in **logs**, not in user-facing payloads.

### Anti-pattern (avoid)

```typescript
// Bad for user-visible `error` fields — can leak internal/JATOS text
catch (error: unknown) {
  const msg = error instanceof Error ? error.message : "Failed"
  return { success: false, error: msg }
}
```

Use **`mapJatosErrorToUserMessage`** for JATOS-related failures at trust boundaries, or fixed strings you control. See also [Error handling audit (pre-MVP)](./refactor/errors.md).

---

## Types

- **`JatosApiError`** hierarchy and **`JatosTransportError`** — typed failures from JATOS HTTP/transport; see [Error handling](#error-handling) and [`src/lib/jatos/errors.ts`](../src/lib/jatos/errors.ts).
- `JatosAuth` — `{ token: string }` for client methods.
- `DownloadPayload` — `{ filename, mimeType, base64 }` for download results.
- `JatosImportResponse` — Import route response (from `@/src/types/jatos-api`).

---

## Admin Study Deletion

App admins can delete studies from both the database and JATOS. This is a **privileged workflow** (not a normal researcher flow) and lives in `src/lib/jatos/admin/`.

**Flow**:

1. `deleteStudyAsAdmin({ studyId, adminUserId, reason })` — entry point
2. Verifies the user has app ADMIN role
3. `grantAdminStudyAccessForDeletion` — ensures the admin is a JATOS study member:
   - If admin is already a researcher on the study → no-op
   - Else: uses a researcher's token (deterministic: PI → COLLABORATOR → VIEWER, then `createdAt`, `userId`) to add the admin as a study member
   - Fails loudly if the study has no researchers
4. Deletes the study from JATOS using the admin's own token
5. Caller deletes from the database

**Token usage**: No `getAdminToken()`. Researcher token is used only to grant temporary membership; the admin's token performs the actual delete (clear audit trail in JATOS logs).

**Exception**: App code may import `deleteStudyAsAdmin` from `admin/deleteStudyWorkflow` for the admin delete mutation. This is the sole exception to the "use jatosAccessService" rule for JATOS operations.

---

## Related Documentation

- [Error handling](./ERROR_HANDLING.md) — app-wide policy (user-facing copy, logging, layers); JATOS § supplements it.
- [Project structure](./PROJECT_STRUCTURE.md) — feature/server/domain boundaries and documented `lib/` exceptions.
- [Server component patterns](./SERVER_COMPONENT_PATTERNS.md) — route-facing server helper pattern.
- [MVP pre-ship checklist](./refactor/mvp-pre-ship-checklist.md) — release audit and JATOS hardening checks.
