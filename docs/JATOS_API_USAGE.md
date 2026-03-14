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
- Direct app import of token resolution (`getTokenForResearcher`, `getTokenForStudyService`, `getServiceAccountToken`)
- Direct app import of provisioning helpers where a facade exists (`jatosAccessService`, `tokenBroker`)

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
  getParticipantFeedback, // participant flow, uses getTokenForStudyService
} from "@/src/lib/jatos/jatosAccessService"

// Server component or action
const metadata = await getResultsMetadataForResearcher({ studyId, userId })
const payload = await downloadAllResultsForResearcher({ studyId, userId })
```

### Participant Flows

Use `getParticipantFeedback` (uses service account token via `getTokenForStudyService`):

```typescript
const result = await getParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  userId,
})
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

| Method                                  | Use Case                                  |
| --------------------------------------- | ----------------------------------------- |
| `getResultsMetadataForResearcher`       | Fetch results metadata                    |
| `getStudyPropertiesForResearcher`       | Fetch study properties                    |
| `getBatchIdForResearcher`               | Get first batch ID from properties        |
| `downloadAllResultsForResearcher`       | Download all results as `DownloadPayload` |
| `getParticipantFeedback`                | Participant feedback (service token)      |
| `createPersonalStudyCodeForParticipant` | Join study (participant)                  |
| `createPersonalStudyCodeForResearcher`  | Pilot link (researcher)                   |
| `getGeneralLinksForResearcher`          | General links for participants            |
| `getHtmlFilesForResearcher`             | HTML files from asset structure           |
| `getEnrichedResultsForResearcher`       | Enriched results for display              |
| `getStudyDataByCommentForResearcher`    | Study data by comment (e.g. "test")       |
| `getAllPilotResultsForResearcher`       | All pilot results                         |
| `getPilotResultByIdForResearcher`       | Single pilot result by ID                 |
| `checkPilotStatusForResearcher`         | Pilot completion status                   |

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

## Related Documentation

- [JATOS Refactor Plan](./JATOS_REFACTOR_PLAN.md) — Architecture and migration details
- [JATOS User-Scoped Tokens](./JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md) — Token types and provisioning
