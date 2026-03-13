# JATOS Integration Refactor Plan

## Overview

This plan describes the refactor from the current mixed architecture (API routes + lib functions, scattered token resolution) to a clean server-only integration with clear separation of concerns.

**Goals:**

- Use **Approach A only**: Server actions / Blitz mutations / queries call JATOS integration directly. No API routes for JATOS — except one deliberate exception for the import route (see [Import decision](#importjatosstudy-decision)).
- Single service layer for access checks, actor resolution, and token strategy.
- Strict token separation: researcher, study-service, admin (provisioning only).
- Use-case-based public API; implementation details stay internal.
- Easier testing: plain server functions, narrow inputs.

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
jatosClient (auth-injected, stateless, transport-only)
    → Single JATOS HTTP request per method
    → Requires JatosAuth { token: string }
    ↓
tokenBroker (token resolution only)
    → getTokenForResearcher(userId)
    → getTokenForStudyService(studyId)
    → getAdminToken() — provisioning only, never used by jatosAccessService
```

**tokenBroker vs provisioning/ split:**

- **tokenBroker** = public facade. It coordinates provisioning by calling internal helpers. It stays broker-sized.
- **provisioning/** = internal operational machinery (researcher creation, study membership sync, retries, diagnostics).

Good: `getTokenForResearcher(userId)` calls internal provider/provisioner helpers.  
Bad: broker starts owning every detail of researcher creation, study membership sync, retries, diagnostics, etc.

### Migration Rules

| Layer                  | Put here if…                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| **jatosClient**        | Single JATOS request, params + auth only, no app user/session/DB                                      |
| **jatosAccessService** | Verifies permissions, chooses token, combines client calls, mixes DB + JATOS, returns business result |
| **utils/parsers**      | No HTTP, no token, pure transform/parse/derive                                                        |

---

## Naming Conventions

### Token Broker

- `getTokenForResearcher(userId)` — researcher JIT token
- `getTokenForStudyService(studyId)` — study-scoped participant operations; must validate service identity is attached to study
- `getAdminToken()` — provisioning only; never called by jatosAccessService

### jatosAccessService (use-case based, not framework-step based)

Public methods are named by use case:

- `getResultsMetadataForResearcher({ studyId, userId })`
- `getStudyPropertiesForResearcher({ studyId, userId })`
- `getParticipantFeedback({ studyId, pseudonym, jatosStudyId })`
- `createPersonalStudyCodeForParticipant({ ... })`
- `createPersonalStudyCodeForResearcher({ ... })`
- `downloadAllResultsForResearcher({ studyId, userId })`
- `getGeneralLinksForResearcher({ studyId, userId, participants, type })`
- `getHtmlFilesForResearcher({ studyId, userId })`
- `getBatchIdForResearcher({ studyId, userId })` (or equivalent)

Internal helpers (not exported):

- `assertResearcherCanAccessStudy({ studyId, userId })`
- `assertParticipantCanAccessStudy({ studyId, pseudonym })`

### jatosClient (auth-injected, stateless, transport-only)

- All methods require `auth: JatosAuth` where `type JatosAuth = { token: string }`
- Token is never optional
- No framework coupling (session, app DB)
- Includes both study data endpoints and admin endpoints (createJatosUser, addStudyMember, etc.) — caller provides the appropriate token

### Narrow Inputs

- Pass `userId`, not `session`
- Pass `studyId`, `pseudonym`, etc. — not full context objects
- The mutation/action boundary extracts from session: `userId: session.userId`

### Download Payload (server/client boundary)

Raw `Blob` is not a clean boundary across server actions and React clients. Use a structured payload:

```ts
type DownloadPayload = {
  filename: string
  mimeType: string
  base64: string
}
```

- **Service** returns `DownloadPayload`
- **Mutation/action** adapts it for the UI (e.g. client decodes base64 and triggers download)

---

## Folder Structure

```
src/lib/jatos/
  tokenBroker.ts              # getTokenForResearcher, getTokenForStudyService, getAdminToken
  jatosClient.ts              # Barrel only — re-exports from client/
  jatosAccessService.ts       # Use-case methods

  client/                     # All JATOS transport (auth-injected, single request per method)
    getResultsMetadata.ts
    getResultsData.ts
    getStudyProperties.ts
    fetchStudyCodes.ts
    getAssetStructure.ts
    uploadStudy.ts           # Admin: POST /studies (FormData); used by import
    deleteStudy.ts
    createJatosUser.ts        # Admin: POST /users
    createJatosUserToken.ts   # Admin: POST /users/{id}/tokens
    addStudyMember.ts         # Admin: PUT /studies/{id}/members/{userId}
    removeStudyMember.ts      # Admin: DELETE /studies/{id}/members/{userId}
    callJatosApi.ts           # Optional: shared outbound helper (URL, auth, error normalization)

  provisioning/               # Workflows/orchestration using client (with getAdminToken)
    provisionResearcherJatos.ts
    ensureResearcherJatosMember.ts
    ensureServiceAccount.ts
    removeResearcherFromJatosStudy.ts
    importJatosStudy.ts       # JATOS upload + DB; called by POST /api/jatos/import route
    provisionResearcherJatos.test.ts
    ...

  parsers/                    # Pure parsing
    parseJatosZip.ts
    formatDetector.ts
    csvParser.ts

  utils/                      # Pure transforms
    matchJatosDataToMetadata.ts
    findStudyResultIdByComment.ts
    getComponentMap.ts
    studyHasParticipantResponses.ts
    checkPilotCompletion.ts
    generateJatosRunUrl.ts
    extractHtmlFilesFromStructure.ts   # From fetchHtmlFiles tree traversal
    extractBatchIdFromProperties.ts   # From fetchJatosBatchId
    extractJatosStudyUuid.ts           # Move from api/
```

**client/ vs provisioning/ split:**

- `client/` = all JATOS transport (study data + admin endpoints). Auth-injected — caller passes token. Provisioning calls `jatosClient.createJatosUser(..., { token: getAdminToken() })` etc.
- `provisioning/` = workflows/orchestration that use client with `getAdminToken()` (ensureResearcherJatosMember, provisionResearcherJatos, etc.)

---

## Per-File Migration Map

### → jatosClient (client/\*.ts)

| Current                             | New                              | Notes                                                  |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------ |
| `api/getResultsMetadata.ts`         | `client/getResultsMetadata.ts`   | Require `auth: JatosAuth`                              |
| `api/getResultsData.ts`             | `client/getResultsData.ts`       | Same                                                   |
| `api/getStudyProperties.ts`         | `client/getStudyProperties.ts`   | Same                                                   |
| `api/fetchStudyCodes.ts`            | `client/fetchStudyCodes.ts`      | Same                                                   |
| `api/deleteStudy.ts`                | `client/deleteStudy.ts`          | Same                                                   |
| (from route)                        | `client/getAssetStructure.ts`    | `GET /studies/{id}/assets/structure`                   |
| (from import route)                 | `client/uploadStudy.ts`          | POST /studies with FormData; require `auth: JatosAuth` |
| `api/admin/createJatosUser.ts`      | `client/createJatosUser.ts`      | Require `auth: JatosAuth`                              |
| `api/admin/createJatosUserToken.ts` | `client/createJatosUserToken.ts` | Same                                                   |
| `api/admin/addStudyMember.ts`       | `client/addStudyMember.ts`       | Same                                                   |
| `api/admin/removeStudyMember.ts`    | `client/removeStudyMember.ts`    | Same                                                   |

### → jatosAccessService

| Current                          | New                                                                                                    | Notes                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `withStudyAccess` callbacks      | `getResultsMetadataForResearcher`, etc.                                                                | Replace with service methods                          |
| `fetchParticipantFeedback`       | `getParticipantFeedback`                                                                               | Move logic into service                               |
| `createPersonalStudyCodeAndSave` | `createPersonalStudyCodeForParticipant`, `createPersonalStudyCodeForResearcher`                        | —                                                     |
| `generateGeneralLinks`           | `getGeneralLinksForResearcher`                                                                         | —                                                     |
| `fetchHtmlFiles`                 | `getHtmlFilesForResearcher`                                                                            | assert → token → getAssetStructure → extractHtmlFiles |
| `fetchJatosBatchId`              | `getBatchIdForResearcher` / `getStudyPropertiesForResearcher`                                          | —                                                     |
| Download flow                    | `downloadAllResultsForResearcher`                                                                      | Returns structured `DownloadPayload` (see below)      |
| Upload flow                      | `provisioning/importJatosStudy.ts` — route calls it; see [Import decision](#importjatosstudy-decision) | —                                                     |

### → utils/parsers

| Current                               | New                                      | Notes                |
| ------------------------------------- | ---------------------------------------- | -------------------- |
| `api/parseJatosZip.ts`                | `parsers/parseJatosZip.ts`               | Already in parsers   |
| `api/matchJatosDataToMetadata.ts`     | `utils/matchJatosDataToMetadata.ts`      | —                    |
| `api/findStudyResultIdByComment.ts`   | `utils/findStudyResultIdByComment.ts`    | —                    |
| `api/getComponentMap.ts`              | `utils/getComponentMap.ts`               | —                    |
| `api/studyHasParticipantResponses.ts` | `utils/studyHasParticipantResponses.ts`  | —                    |
| `api/checkPilotCompletion.ts`         | `utils/checkPilotCompletion.ts`          | —                    |
| `api/generateJatosRunUrl.ts`          | `utils/generateJatosRunUrl.ts`           | —                    |
| `api/extractJatosStudyUuid.ts`        | `parsers/extractJatosStudyUuid.ts`       | —                    |
| (from fetchHtmlFiles)                 | `utils/extractHtmlFilesFromStructure.ts` | Tree traversal logic |
| (from fetchJatosBatchId)              | `utils/extractBatchIdFromProperties.ts`  | Extract batch ID     |

### → tokenBroker

| Current                    | Consolidate into tokenBroker                                   |
| -------------------------- | -------------------------------------------------------------- |
| `getTokenForResearcher.ts` | `getTokenForResearcher(userId)`                                |
| `tokenCache.ts`            | Internal to tokenBroker                                        |
| `serviceAccount.ts`        | `getTokenForStudyService(studyId)` — validate study membership |
| `JATOS_TOKEN` for admin    | `getAdminToken()` — provisioning only                          |

**Broker size discipline:** tokenBroker is a public facade that coordinates provisioning, not a god module. It calls internal provider/provisioner helpers. It must _not_ own every detail of researcher creation, study membership sync, retries, diagnostics, etc. That lives in `provisioning/*`.

### → Delete

| File                                    | Reason                                                  |
| --------------------------------------- | ------------------------------------------------------- |
| `api/client.ts`                         | Internal-route wrapper (calls `/api/jatos/`), not JATOS |
| `api/fetchResultsBlob.ts`               | Fetches our route                                       |
| `api/fetchStudyAssets.ts`               | Fetches our route                                       |
| `api/createPersonalStudyCodeAndSave.ts` | Uses callJatosApi                                       |
| `api/downloadBlob.ts`                   | Fetches our route                                       |
| `api/uploadStudyFile.ts`                | Fetches our route                                       |
| `api/deleteExistingJatosStudy.ts`       | Fetches our route                                       |
| `api/fetchJatosBatchId.ts`              | Fetches our route                                       |
| `api/generateGeneralLinks.ts`           | Fetches our route                                       |
| `api/fetchHtmlFiles.ts`                 | Replaced by client + util + service                     |

### API Routes to Remove

| Route                                       | Replaced by                           |
| ------------------------------------------- | ------------------------------------- |
| `GET/POST /api/jatos/get-results-metadata`  | Direct service call                   |
| `POST /api/jatos/get-results-data`          | Direct service call                   |
| `GET /api/jatos/get-study-properties`       | Direct service call                   |
| `GET /api/jatos/get-asset-structure`        | Direct service call                   |
| `GET /api/jatos/get-study-code`             | Direct service call                   |
| `POST /api/jatos/get-all-results`           | Direct service call                   |
| `POST /api/jatos/create-personal-studycode` | Direct service call                   |
| `DELETE /api/jatos/delete-study`            | Direct service call                   |
| `POST /api/jatos/import`                    | **Keep** — sole exception (see below) |

### importJatosStudy decision

**Chosen approach: Dedicated route handler (Option 2)**

File upload (FormData) requires multipart handling. We keep **one** route handler (`POST /api/jatos/import`) as a deliberate, documented exception.

**Rationale:**

- **Large files:** JATOS .jzip files can be 100MB. The route already has `maxDuration: 60` and a 100MB limit. Server actions default to 1MB and have had FormData truncation issues.
- **Blitz RPC:** Mutations serialize to JSON; they cannot accept `File` or `FormData`.
- **Proven:** The current route works. Refactor extracts logic to a service layer; the route stays as a thin transport boundary.

**Implementation:**

1. **Service layer:** Add `importJatosStudyForResearcher({ file, studyId, userId, jatosWorkerType })` in `provisioning/importJatosStudy.ts`. It:

   - Computes build hash from the file (extract `computeBuildHash` to `utils/` or keep in provisioning)
   - Calls `jatosClient.uploadStudy(file, { token: getAdminToken() })` — add `client/uploadStudy.ts` for POST /jatos/api/v1/studies
   - Performs DB updates (Study, JatosStudyUpload) — logic from current `importJatos` mutation
   - Syncs researcher membership and service account via `ensureResearcherJatosMember`, `addStudyMember`
   - Returns `JatosImportResponse`

2. **Route handler:** `POST /api/jatos/import` remains. It:

   - Receives FormData (`studyFile`, `studyId`, `jatosWorkerType`)
   - Resolves session (userId) from cookies
   - Validates researcher access to study
   - Calls the import service
   - Returns JSON result

3. **Client:** `Step2Content` continues to call `uploadStudyFile` (which fetches the route). FormData includes `studyFile`, `studyId`, `jatosWorkerType`. The route returns the full import result. The client no longer calls `importJatosMutation` for the upload flow — the service handles JATOS + DB. The client uses the route result for follow-up steps (batch ID, setup completion, pilot link) as today.

4. **Document:** Add this exception to `JATOS_API_USAGE.md` and keep it referenced here.

**Key principle:** All import logic (admin token, JATOS API call, DB updates) lives in the service layer. The route is only the transport boundary for FormData.

---

## Implementation Phases

### Phase 1: Foundation

1. Create `client/` folder and migrate all transport modules with `JatosAuth` required (study data + admin endpoints).
2. Create `tokenBroker.ts` consolidating `getTokenForResearcher`, `getTokenForStudyService`, `getAdminToken`. Keep it broker-sized; provisioning details stay in `provisioning/*`.
3. Create `jatosClient.ts` barrel.
4. Add `client/getAssetStructure.ts` (extract from route).
5. Migrate `api/admin/*` into `client/` (createJatosUser, createJatosUserToken, addStudyMember, removeStudyMember).

### Phase 2: jatosAccessService

1. Create `jatosAccessService.ts` with internal helpers `assertResearcherCanAccessStudy`, `assertParticipantCanAccessStudy`.
2. Implement use-case methods one by one, migrating call sites.
3. Extract pure logic into `utils/` (extractHtmlFilesFromStructure, extractBatchIdFromProperties).

### Phase 3: Migrate Call Sites

1. **Researcher flows:** Replace `withStudyAccess` + lib calls with `jatosAccessService.*ForResearcher`.
2. **Participant flows:** Replace `getServiceAccountToken` + lib calls with `jatosAccessService.getParticipantFeedback`, etc.
3. **Client components:** Replace `downloadBlob`, `createPersonalStudyCodeAndSave`, `uploadStudyFile`, etc. with mutations/actions that call the service.

### Phase 4: Remove API Routes and Dead Code

1. Delete `/api/jatos/*` routes except `POST /api/jatos/import` (see [Import decision](#importjatosstudy-decision)).
2. Create `provisioning/importJatosStudy.ts`; refactor the import route to call it; extend FormData to include `studyId`, `jatosWorkerType`.
3. Delete deprecated `api/*` files. Update the client `uploadStudyFile` helper to post FormData with `studyFile`, `studyId`, `jatosWorkerType` to the import route.
4. Update `lib/jatos/index.ts` exports.

### Phase 5: Cleanup

1. Update tests.
2. Update `JATOS_API_USAGE.md` — document the import route as the sole JATOS API route exception.
3. Update `JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md`.

---

## Critical Constraints

1. **Admin token isolation:** `getAdminToken()` is never called by jatosAccessService. Only provisioning and tokenBroker use it — they call `jatosClient.createJatosUser`, `jatosClient.addStudyMember`, etc. with `{ token: getAdminToken() }`.

2. **Provisioning behind broker:** jatosAccessService never knows about provisioning. It only calls `tokenBroker.getTokenForResearcher(userId)` etc. Provisioning (ensureResearcherJatosMember, etc.) is internal to tokenBroker.

3. **getTokenForStudyService(studyId):** Implementation must validate that the service identity is attached to the study, or fail loudly. Not just "return global service token."

4. **jatosClient auth:** Token is always required. No optional `{ token?: string }`. Use `type JatosAuth = { token: string }`.

5. **Concurrency:** tokenBroker must prevent duplicate concurrent refresh/provision for the same researcher or service identity. Otherwise this will bite under real usage (e.g. multiple tabs, rapid requests).

6. **jatosAccessService scope:** It should own use cases, not every JATOS-related helper. Do not let it become the place for every JATOS-related behavior in the app. Keep that discipline while coding.

---

## Call Site Updates

| Current                                                                             | New                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withStudyAccess(studyId, (sId, uId, token) => getResultsMetadata(..., { token }))` | `jatosAccessService.getResultsMetadataForResearcher({ studyId, userId })`                                                                                                        |
| `fetchParticipantFeedback` action                                                   | `jatosAccessService.getParticipantFeedback({ studyId, pseudonym, jatosStudyId })`                                                                                                |
| `DownloadResultsButton` → `downloadBlob('/api/jatos/...')`                          | Mutation → `jatosAccessService.downloadAllResultsForResearcher({ studyId, userId })` → returns `DownloadPayload`; mutation adapts for UI (decode base64, trigger download)       |
| `JoinStudyButton` → `createPersonalStudyCodeAndSave`                                | Mutation → `jatosAccessService.createPersonalStudyCodeForParticipant(...)`                                                                                                       |
| `Step2Content` → `uploadStudyFile`, `fetchJatosBatchId`                             | `uploadStudyFile` (route) for FormData — posts `studyFile`, `studyId`, `jatosWorkerType`; route calls import service. `fetchJatosBatchId` → mutation → `getBatchIdForResearcher` |
| `generateResearcherPilotRunUrl` → `createPersonalStudyCodeAndSave`                  | `jatosAccessService.createPersonalStudyCodeForResearcher(...)`                                                                                                                   |

---

## Related Documents

- [JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md](./JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md) — Token types, provisioning, migration for existing data
- [JATOS_API_USAGE.md](./JATOS_API_USAGE.md) — Update after refactor to reflect new patterns
