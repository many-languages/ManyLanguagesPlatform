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

### Feedback helpers (`src/lib/feedback`)

Feedback template rendering and cohort aggregation for `stat:…:across` live in **`src/lib/feedback/`** so **`jatosAccessService` does not import from `src/app/**`**. That keeps the JATOS use-case layer depending only on other `src/lib` modules (plus shared types).

| Module                           | Role                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types`, `feedbackRenderContext` | `FeedbackRenderContext`, `buildFeedbackRenderContext`                                                                                                             |
| `requiredVariableNames`          | `extractRequiredVariableNames`, `buildRequiredKeysHash`                                                                                                           |
| `statAcrossKeys`                 | `statAcrossLookupKey`; `templateUsesStatAcross` (uses `createFeedbackStatPlaceholderRegex` from `feedbackStatPlaceholder.ts` so “uses across” matches render/DSL) |
| `variableRowAggregation`         | `collectVariableValuesAcrossAllRows`, `buildPredicate` (where-clauses)                                                                                            |
| `computeAggregatedAcrossStats`   | `computeAggregatedAcrossStatsForTemplate` — used inside `getParticipantFeedback` when the template uses `stat:…:across`, and for researcher static feedback       |
| `extractVariableBundleForRender` | Re-exports `extractVariableBundleForRenderFromResults` from the study **variables** module — single supported import path for lib code                            |

Routes under `src/app/.../feedback/utils/` may **re-export** the same symbols for relative imports; prefer `@/src/lib/feedback/...` in new code.

### Key Principles

- **No API routes for JATOS** — except the import route (see below).
- **No direct `client/*` imports** — App code must not import from `src/lib/jatos/client/*`. Use `jatosAccessService` for all JATOS operations. The sole exception is `browser/uploadStudyFile` for FormData uploads.
- **Use-case API** — Call `jatosAccessService.*ForResearcher` or `*ForParticipant`, not low-level client methods.
- **Narrow inputs** — Pass `userId`, `studyId`, `pseudonym`, etc., not session objects.
- **Token separation** — `getAdminToken()` is never called by jatosAccessService; only provisioning uses it.

### App vs JATOS Separation

- **withStudyAccess** — App-level access helper. Handles session + researcher DB access. Does NOT resolve tokens or call JATOS. Use for DB-only flows and for mixed flows when early app-level authorization is needed.
- **jatosAccessService** — JATOS integration layer. Resolves tokens, calls JATOS. App code must not bypass it.
- **Mixed flows** — A mutation may use `withStudyAccess` for app-level auth, do DB work, then call `jatosAccessService` for JATOS. This is acceptable. Duplicated access checks (in both layers) preserve clean responsibility boundaries.

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
  userId,
  templateContent,
  requiredVariableKeyList,
})
// result.data: { enrichedResult, aggregatedAcrossStats? } — never raw cohort arrays
```

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

| Method                                  | Use Case                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `getResultsMetadataForResearcher`       | Fetch results metadata                                                                 |
| `getStudyPropertiesForResearcher`       | Fetch study properties                                                                 |
| `getBatchIdForResearcher`               | Get first batch ID from properties                                                     |
| `downloadAllResultsForResearcher`       | Download all results as `DownloadPayload`                                              |
| `getParticipantFeedback`                | Participant feedback (viewer token); template-driven cohort aggregates in-service only |
| `createPersonalStudyCodeForParticipant` | Join study (participant; uses researcher token)                                        |
| `createPersonalStudyCodeForResearcher`  | Pilot link (researcher)                                                                |
| `getGeneralLinksForResearcher`          | General links for participants                                                         |
| `getHtmlFilesForResearcher`             | HTML files from asset structure                                                        |
| `getEnrichedResultsForResearcher`       | Enriched results for display                                                           |
| `getStudyDataByCommentForResearcher`    | Study data by comment (e.g. "test")                                                    |
| `getAllPilotResultsForResearcher`       | All pilot results                                                                      |
| `getPilotResultByIdForResearcher`       | Single pilot result by ID                                                              |
| `checkPilotStatusForResearcher`         | Pilot completion status                                                                |

---

## Error Handling

**jatosAccessService** throws on authorization failure or JATOS errors. Wrap in try/catch:

```typescript
try {
  const data = await getResultsMetadataForResearcher({ studyId, userId })
  return { success: true, data }
} catch (error: any) {
  return { success: false, error: error.message }
}
```

---

## Types

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

- [JATOS Refactor Plan](./JATOS_REFACTOR_PLAN.md) — Architecture and migration details
- [JATOS User-Scoped Tokens](./JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md) — Token types and provisioning
- [Feedback rendering (server-side)](./FEEDBACK_RENDERING_SERVER_SIDE_PLAN.md) — Markdown pipeline, `aggregatedAcrossStats`, `src/lib/feedback`
