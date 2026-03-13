# JATOS Integration Refactor Plan

## Overview

This plan describes the refactor from the current mixed architecture (API routes + lib functions, scattered token resolution) to a clean server-only integration with clear separation of concerns.

**Goals:**

- Use **Approach A only**: Server actions / Blitz mutations / queries call JATOS integration directly. No API routes for JATOS.
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

  client/                     # Transport implementation
    getResultsMetadata.ts
    getResultsData.ts
    getStudyProperties.ts
    fetchStudyCodes.ts
    getAssetStructure.ts
    deleteStudy.ts
    callJatosApi.ts           # Optional: shared outbound helper (URL, auth, error normalization)

  provisioning/               # Admin provisioning + orchestration
    provisionResearcherJatos.ts
    ensureResearcherJatosMember.ts
    ensureServiceAccount.ts
    provisionResearcherJatos.test.ts
    ...

  admin/                      # Raw JATOS admin API calls (resolve this split early)
    createJatosUser.ts
    createJatosUserToken.ts
    addStudyMember.ts
    removeStudyMember.ts

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

**admin/ vs provisioning/ split (resolve early):**

- `admin/` = raw JATOS admin API calls (create user, mint token, add/remove member)
- `provisioning/` = workflows/orchestration using those calls (ensureResearcherJatosMember, etc.)

If you do not need both, collapse them now. But pick one model and stick to it. Do not postpone this — it will create confusion fast.

---

## Per-File Migration Map

### → jatosClient (client/\*.ts)

| Current                     | New                            | Notes                                |
| --------------------------- | ------------------------------ | ------------------------------------ |
| `api/getResultsMetadata.ts` | `client/getResultsMetadata.ts` | Require `auth: JatosAuth`            |
| `api/getResultsData.ts`     | `client/getResultsData.ts`     | Same                                 |
| `api/getStudyProperties.ts` | `client/getStudyProperties.ts` | Same                                 |
| `api/fetchStudyCodes.ts`    | `client/fetchStudyCodes.ts`    | Same                                 |
| `api/deleteStudy.ts`        | `client/deleteStudy.ts`        | Same                                 |
| (from route)                | `client/getAssetStructure.ts`  | `GET /studies/{id}/assets/structure` |

### → jatosAccessService

| Current                          | New                                                                             | Notes                                                 |
| -------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `withStudyAccess` callbacks      | `getResultsMetadataForResearcher`, etc.                                         | Replace with service methods                          |
| `fetchParticipantFeedback`       | `getParticipantFeedback`                                                        | Move logic into service                               |
| `createPersonalStudyCodeAndSave` | `createPersonalStudyCodeForParticipant`, `createPersonalStudyCodeForResearcher` | —                                                     |
| `generateGeneralLinks`           | `getGeneralLinksForResearcher`                                                  | —                                                     |
| `fetchHtmlFiles`                 | `getHtmlFilesForResearcher`                                                     | assert → token → getAssetStructure → extractHtmlFiles |
| `fetchJatosBatchId`              | `getBatchIdForResearcher` / `getStudyPropertiesForResearcher`                   | —                                                     |
| Download flow                    | `downloadAllResultsForResearcher`                                               | Returns structured `DownloadPayload` (see below)      |
| Upload flow                      | See [Import decision](#importjatosstudy-decision)                               | —                                                     |

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

| Route                                       | Replaced by                                       |
| ------------------------------------------- | ------------------------------------------------- |
| `GET/POST /api/jatos/get-results-metadata`  | Direct service call                               |
| `POST /api/jatos/get-results-data`          | Direct service call                               |
| `GET /api/jatos/get-study-properties`       | Direct service call                               |
| `GET /api/jatos/get-asset-structure`        | Direct service call                               |
| `GET /api/jatos/get-study-code`             | Direct service call                               |
| `POST /api/jatos/get-all-results`           | Direct service call                               |
| `POST /api/jatos/create-personal-studycode` | Direct service call                               |
| `DELETE /api/jatos/delete-study`            | Direct service call                               |
| `POST /api/jatos/import`                    | See [Import decision](#importjatosstudy-decision) |

### importJatosStudy decision

File upload (FormData) needs a hard decision. Do not leave a half-refactored exception that becomes an architectural leak.

**Choose one and commit:**

1. **Server action handles FormData directly** — If your stack (Blitz/Next) handles multipart upload ergonomically in a server action, use that. The mutation calls the same provisioning/service layer.
2. **Dedicated route handler for multipart upload only** — If server actions are awkward for large file uploads, keep _one_ route handler (`POST /api/jatos/import`) that accepts FormData and calls the same provisioning layer. Make it a deliberate, documented exception.

Either way, the import logic (admin token, JATOS API call, DB updates) lives in one place. The route/action is only the transport boundary.

---

## Implementation Phases

### Phase 1: Foundation

1. Resolve `admin/` vs `provisioning/` split (see [Folder Structure](#folder-structure)). Do not postpone.
2. Create `client/` folder and migrate transport modules with `JatosAuth` required.
3. Create `tokenBroker.ts` consolidating `getTokenForResearcher`, `getTokenForStudyService`, `getAdminToken`. Keep it broker-sized; provisioning details stay in `provisioning/*`.
4. Create `jatosClient.ts` barrel.
5. Add `client/getAssetStructure.ts` (extract from route).

### Phase 2: jatosAccessService

1. Create `jatosAccessService.ts` with internal helpers `assertResearcherCanAccessStudy`, `assertParticipantCanAccessStudy`.
2. Implement use-case methods one by one, migrating call sites.
3. Extract pure logic into `utils/` (extractHtmlFilesFromStructure, extractBatchIdFromProperties).

### Phase 3: Migrate Call Sites

1. **Researcher flows:** Replace `withStudyAccess` + lib calls with `jatosAccessService.*ForResearcher`.
2. **Participant flows:** Replace `getServiceAccountToken` + lib calls with `jatosAccessService.getParticipantFeedback`, etc.
3. **Client components:** Replace `downloadBlob`, `createPersonalStudyCodeAndSave`, `uploadStudyFile`, etc. with mutations/actions that call the service.

### Phase 4: Remove API Routes and Dead Code

1. Delete `/api/jatos/*` routes per [Import decision](#importjatosstudy-decision) — keep `import` route only if you chose the dedicated route handler option.
2. Delete deprecated `api/*` files.
3. Update `lib/jatos/index.ts` exports.

### Phase 5: Cleanup

1. Update tests.
2. Update `JATOS_API_USAGE.md` and `JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md`.

---

## Critical Constraints

1. **Admin token isolation:** `getAdminToken()` is never called by jatosAccessService. Only for provisioning, token minting, user creation, study membership.

2. **Provisioning behind broker:** jatosAccessService never knows about provisioning. It only calls `tokenBroker.getTokenForResearcher(userId)` etc. Provisioning (ensureResearcherJatosMember, etc.) is internal to tokenBroker.

3. **getTokenForStudyService(studyId):** Implementation must validate that the service identity is attached to the study, or fail loudly. Not just "return global service token."

4. **jatosClient auth:** Token is always required. No optional `{ token?: string }`. Use `type JatosAuth = { token: string }`.

5. **Concurrency:** tokenBroker must prevent duplicate concurrent refresh/provision for the same researcher or service identity. Otherwise this will bite under real usage (e.g. multiple tabs, rapid requests).

6. **jatosAccessService scope:** It should own use cases, not every JATOS-related helper. Do not let it become the place for every JATOS-related behavior in the app. Keep that discipline while coding.

---

## Call Site Updates

| Current                                                                             | New                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withStudyAccess(studyId, (sId, uId, token) => getResultsMetadata(..., { token }))` | `jatosAccessService.getResultsMetadataForResearcher({ studyId, userId })`                                                                                                  |
| `fetchParticipantFeedback` action                                                   | `jatosAccessService.getParticipantFeedback({ studyId, pseudonym, jatosStudyId })`                                                                                          |
| `DownloadResultsButton` → `downloadBlob('/api/jatos/...')`                          | Mutation → `jatosAccessService.downloadAllResultsForResearcher({ studyId, userId })` → returns `DownloadPayload`; mutation adapts for UI (decode base64, trigger download) |
| `JoinStudyButton` → `createPersonalStudyCodeAndSave`                                | Mutation → `jatosAccessService.createPersonalStudyCodeForParticipant(...)`                                                                                                 |
| `Step2Content` → `uploadStudyFile`, `fetchJatosBatchId`                             | Mutations → service methods                                                                                                                                                |
| `generateResearcherPilotRunUrl` → `createPersonalStudyCodeAndSave`                  | `jatosAccessService.createPersonalStudyCodeForResearcher(...)`                                                                                                             |

---

## Related Documents

- [JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md](./JATOS_USER_SCOPED_TOKENS_IMPLEMENTATION_PLAN.md) — Token types, provisioning, migration for existing data
- [JATOS_API_USAGE.md](./JATOS_API_USAGE.md) — Update after refactor to reflect new patterns
