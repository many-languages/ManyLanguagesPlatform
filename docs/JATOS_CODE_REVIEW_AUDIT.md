# JATOS Integration Code Review Audit

## Architecture Issues

### 1. Queries/mutations calling jatosClient directly (bypassing jatosAccessService)

**Files:**

- `src/app/(app)/dashboard/queries/getParticipantCompletedNotPaidStudies.ts`
- `src/app/(app)/dashboard/queries/getParticipantIncompleteStudies.ts`
- `src/app/(app)/dashboard/queries/getParticipantStudyCounts.ts`
- `src/app/(app)/studies/queries/getParticipantStudiesWithStatus.ts`
- `src/app/(app)/studies/[studyId]/feedback/actions/checkParticipantCompletion.ts`
- `src/app/(app)/dashboard/queries/getActiveStudiesWithResponseCounts.ts`
- `src/app/(app)/studies/[studyId]/setup/mutations/checkJatosStudyUuid.ts`

**Snippet (representative):**

```typescript
// getParticipantCompletedNotPaidStudies.ts:56-57
const token = await getServiceAccountToken()
metadata = await getResultsMetadata({ studyIds: jatosStudyIds }, { token })
```

**Problem:** Server code imports `getResultsMetadata` from client and `getServiceAccountToken` from serviceAccount/tokenBroker, then calls the client directly. This bypasses `jatosAccessService`, which should be the single use-case layer for JATOS operations.

**Improvement:** Add `jatosAccessService` methods for these use cases:

- `getResultsMetadataForParticipantDashboard({ userId, jatosStudyIds })` — verifies participant access via DB (participations filtered by userId), uses `getTokenForStudyService` per study or a batch variant, calls client.
- `getResultsMetadataForResearcherDashboard({ userId })` — already similar to `getActiveStudiesWithResponseCounts`; refactor to call `getResultsMetadataForResearcher` with studyIds/studyUuids.
- `checkParticipantCompletionForParticipant({ studyId, pseudonym, jatosStudyId, userId })` — wraps the check with `assertParticipantCanAccessStudy`, uses `getTokenForStudyService(jatosStudyId)`.
- `checkJatosStudyUuidForResearcher({ studyId, userId, jatosStudyUUID, mode })` — wraps UUID validation + `checkJatosStudyExists` + response check; access already verified by `verifyResearcherStudyAccess`.

---

### 2. ~~checkJatosStudyExists does not follow jatosClient pattern~~ (FIXED)

**File:** Moved to `src/lib/jatos/provisioning/checkJatosStudyExistsAdmin.ts`

**Resolution:** Moved to `provisioning/` and renamed to `checkJatosStudyExistsAdmin`. Uses `getAdminToken()` for explicit admin token usage. Call site (`checkJatosStudyUuid`) updated to import from the new location.

---

### 3. ~~withStudyAccess resolves token but most callbacks ignore it~~ (FIXED)

**File:** `src/app/(app)/studies/[studyId]/utils/withStudyAccess.ts`

**Resolution:** Simplified to authorization-only. Removed token resolution and `getTokenForResearcher` import. Callback now receives `(studyId, userId)` only. All 10 call sites updated (none were using the token).

---

### 4. ~~Index barrel exports transport layer, encouraging bypass~~ (FIXED)

**File:** `src/lib/jatos/index.ts`

**Resolution:** Removed transport exports (getResultsData, getResultsMetadata, getStudyProperties, fetchStudyCodes, deleteStudy, uploadStudyFile). Barrel now exports only jatosAccessService and pure utils/parsers. Transport functions remain in jatosClient.ts and client/\* for direct import when needed.

---

## Security Issues

### 1. ~~tokenBroker falls back to admin token in normal flows~~ (FIXED)

**File:** `src/lib/jatos/tokenBroker.ts`

**Resolution:** Removed all admin token fallbacks. `getTokenForResearcher` now throws if provisioning fails (no try/catch fallback). `getTokenForStudyService` and `getServiceAccountToken` throw with a clear error when the service account is not provisioned.

---

### 2. ~~Participant dashboard queries: service account scope~~ (FIXED)

**Files:** `getParticipantCompletedNotPaidStudies`, `getParticipantIncompleteStudies`, `getParticipantStudyCounts`, `getParticipantStudiesWithStatus`

**Resolution:** All four now use `getResultsMetadataForParticipantDashboard` from jatosAccessService, which uses `getTokenForStudyService(jatosStudyIds[0])` for study validation. No more `getServiceAccountToken` or direct client calls.

---

### 3. ~~checkParticipantCompletion: acceptable but should use access service~~ (FIXED)

**File:** `src/app/(app)/studies/[studyId]/feedback/actions/checkParticipantCompletion.ts`

**Resolution:** Action now calls `checkParticipantCompletionForParticipant` from jatosAccessService, which uses `assertParticipantCanAccessStudy` and `getTokenForStudyService(jatosStudyId)`.

---

## Code Smells

### 1. ~~Duplicated pilot comment logic~~ (FIXED)

**Files:** `src/lib/jatos/utils/pilotComment.ts` (new)

**Resolution:** Extracted to `utils/pilotComment.ts` with `PILOT_COMMENT_PREFIX`, `extractPilotMarkerToken(comment)`, `isPilotComment(comment)`. Both `jatosAccessService` and `checkPilotCompletion` now import from the shared module.

---

### 2. ~~getGeneralLinksForResearcher uses JATOS_BASE, generateJatosRunUrl uses NEXT_PUBLIC_JATOS_BASE~~ (FIXED)

**File:** `src/lib/jatos/jatosAccessService.ts`

**Resolution:** `getGeneralLinksForResearcher` now uses `generateJatosRunUrl(codes[0])` instead of manually constructing with `JATOS_BASE`. Run URLs for participants use the single source of truth (`NEXT_PUBLIC_JATOS_BASE` via `generateJatosRunUrl`).

---

### 3. ~~getParticipantFeedback: redundant success check~~ (FIXED)

**File:** `src/lib/jatos/jatosAccessService.ts`

**Resolution:** Removed redundant `if (allResultsResult.success)` check. Added comment that `getResultsData` throws on failure.

---

### 4. ~~importJatosStudy calls getAdminToken() twice~~ (FIXED)

**File:** `src/lib/jatos/provisioning/importJatosStudy.ts`

**Resolution:** Reuse `token` from line 68 for `addStudyMember` call instead of calling `getAdminToken()` again.

---

### 5. Large jatosAccessService

**File:** `src/lib/jatos/jatosAccessService.ts` (~420 lines)

**Problem:** Many use cases in one file. Harder to navigate and test.

**Improvement:** Consider splitting by domain: `researcherResults.ts`, `participantFeedback.ts`, `pilotResults.ts`, `studySetup.ts`, with a thin `jatosAccessService.ts` re-exporting. Not urgent.

---

## TypeScript Improvements

### 1. `any` in checkPilotCompletionFromMetadata

**File:** `src/lib/jatos/utils/checkPilotCompletion.ts`

**Snippet:**

```typescript
export function checkPilotCompletionFromMetadata(
  metadata: any,
  ...
): boolean {
  return metadata.data.some((study: any) => {
    return study.studyResults?.some((result: any) => {
```

**Improvement:** Use `JatosMetadata` from `@/src/types/jatos` for `metadata`. Type `study` and `result` from `JatosMetadataStudy` and `JatosStudyResult`.

---

### 2. `any` in findStudyResultIdByComment

**File:** `src/lib/jatos/utils/findStudyResultIdByComment.ts`

**Snippet:**

```typescript
export function findStudyResultIdByComment(metadata: any, comment: string): number | null {
  // ...
  const match = results.find((res: any) => res.comment?.trim() === comment.trim())
```

**Improvement:** Use `JatosMetadata` for `metadata` and `JatosStudyResult` for `res`.

---

### 3. `any` in matchJatosDataToMetadata

**File:** `src/lib/jatos/utils/matchJatosDataToMetadata.ts` line 33

**Snippet:**

```typescript
let parsedData: any = undefined
```

**Improvement:** Use `unknown` or a union of expected parsed shapes (e.g. `Record<string, unknown> | unknown[]`).

---

### 4. `error: any` in catch blocks

**Files:** `checkParticipantCompletion.ts`, `results.ts`, `fetchParticipantFeedback.ts`, `api/jatos/import/route.ts`, `checkJatosStudyUuid.ts`

**Problem:** `catch (error: any)` loses type safety and encourages `error?.message` without proper checks.

**Improvement:** Use `catch (error: unknown)` and narrow: `const message = error instanceof Error ? error.message : "Unknown error"`.

---

### 5. getResultsMetadata / getResultsData return types

**Files:** `getResultsMetadata.ts`, `getResultsData.ts`

**Problem:** Return types are implicit. Callers use `Awaited<ReturnType<typeof getResultsMetadata>>` which is fragile.

**Improvement:** Define explicit return types, e.g. `JatosMetadata` for metadata, `{ success: true; data: ArrayBuffer; contentType: string }` for getResultsData. Export from types.

---

### 6. getAssetStructure returns Promise<unknown>

**File:** `src/lib/jatos/client/getAssetStructure.ts`

**Snippet:**

```typescript
): Promise<unknown> {
  // ...
  return JSON.parse(text)
```

**Improvement:** Define an `AssetStructureResponse` type (or use `{ data?: AssetNode }`) and return that. `jatosAccessService` already casts; the client should own the type.

---

## API Consistency Issues

### 1. getResultsData params: studyIds as number vs number[]

**File:** `src/lib/jatos/jatosAccessService.ts` line 191

**Snippet:**

```typescript
const allResultsResult = await getResultsData({ studyIds: jatosStudyId }, { token })
```

**Problem:** Elsewhere `studyIds` is passed as `[jatosStudyId]` (e.g. lines 163, 281, 345). JATOS may expect arrays. Validation allows both; usage is inconsistent.

**Improvement:** Always use arrays: `{ studyIds: [jatosStudyId] }`. Verify JATOS API accepts arrays and normalize all call sites.

---

### 2. getResultsData params: studyResultIds as number vs number[]

**File:** `src/lib/jatos/jatosAccessService.ts` lines 177, 398, 508

**Snippet:**

```typescript
await getResultsData({ studyResultIds: resultId }, { token })
```

**Problem:** `resultId` is a single number. JATOS may expect `studyResultIds: [resultId]`. Validation allows both.

**Improvement:** Use arrays consistently: `{ studyResultIds: [resultId] }`. Confirm JATOS API format.

---

### 3. Narrow inputs

**Problem:** Most `jatosAccessService` methods correctly take `userId` (number) rather than full session objects. `fetchParticipantFeedbackAction` and similar correctly pass `userId` from session. No major violations found.

---

## Performance / Robustness Concerns

### 1. getParticipantFeedback: two sequential getResultsData calls

**File:** `src/lib/jatos/jatosAccessService.ts` lines 177, 192

**Snippet:**

```typescript
const { data: arrayBuffer } = await getResultsData({ studyResultIds: resultId }, { token })
// ...
const allResultsResult = await getResultsData({ studyIds: jatosStudyId }, { token })
```

**Problem:** Two JATOS calls when one might suffice. The second fetches all study results; the first fetches only the participant's result.

**Improvement:** If `allEnrichedResults` is needed, consider whether a single call with `studyIds` is enough and the participant result can be filtered client-side. Otherwise, document why both calls are required.

---

### 2. Participant dashboard queries: single metadata call for many studies

**Files:** `getParticipantCompletedNotPaidStudies`, etc.

**Problem:** One `getResultsMetadata({ studyIds: jatosStudyIds })` for all studies is appropriate. No change needed.

---

### 3. Token cache TTL and race conditions

**File:** `src/lib/jatos/tokenBroker.ts`

**Snippet:**

```typescript
const CACHE_TTL_MS = 55 * 60 * 1000
const inFlightPromises = new Map<number, Promise<string>>()
```

**Problem:** `inFlightPromises` deduplicates concurrent requests for the same `jatosUserId`. If token refresh fails mid-flight, all waiters get the same error. Acceptable.

**Note:** 55-minute TTL is reasonable for typical JATOS token lifetime. No change suggested.

---

### 4. Silent failures in participant queries

**Files:** `getParticipantCompletedNotPaidStudies`, `getParticipantIncompleteStudies`, `getParticipantStudyCounts`, `getParticipantStudiesWithStatus`, `getActiveStudiesWithResponseCounts`

**Snippet:**

```typescript
} catch (error) {
  console.error("JATOS metadata fetch failed...", error)
  return []  // or default counts
}
```

**Problem:** JATOS failures are logged but the UI gets empty/default data. Users may not realize something failed.

**Improvement:** Consider returning a status like `{ data: [...], jatosError?: string }` so the UI can show a warning. Or at least ensure errors are visible in monitoring.

---

## Suggested Refactors

### Priority 1 (Architecture)

1. Add `jatosAccessService` methods for participant dashboard and researcher dashboard metadata.
2. Refactor `getParticipantCompletedNotPaidStudies`, `getParticipantIncompleteStudies`, `getParticipantStudyCounts`, `getParticipantStudiesWithStatus` to call `jatosAccessService`.
3. Refactor `getActiveStudiesWithResponseCounts` to use `getResultsMetadataForResearcher` (or a new batch method).
4. Refactor `checkParticipantCompletion` to use a new `jatosAccessService.checkParticipantCompletionForParticipant`.
5. Refactor `checkJatosStudyUuid` to use `jatosAccessService` or a dedicated provisioning helper.
6. Remove transport exports from `src/lib/jatos/index.ts`; keep them only in `jatosClient.ts`.

### Priority 2 (Security)

7. Remove admin-token fallback in `getTokenForResearcher`; throw on provisioning failure.
8. Remove or restrict admin-token fallback in `getTokenForStudyService` and `getServiceAccountToken`.
9. Align `checkJatosStudyExists` with the client pattern or move it to provisioning.

### Priority 3 (Code quality)

10. Extract pilot comment helpers to `utils/pilotComment.ts`.
11. Unify `JATOS_BASE` vs `NEXT_PUBLIC_JATOS_BASE` for run URLs.
12. Replace `any` with proper types in utils and catch blocks.
13. Add explicit return types for `getResultsMetadata` and `getResultsData`.
14. Use `studyIds: [id]` and `studyResultIds: [id]` consistently.

### Priority 4 (Minor)

15. Cache `getAdminToken()` in `importJatosStudy`.
16. Remove redundant `allResultsResult.success` check or document behavior.
17. Simplify `withStudyAccess` by removing token resolution when not needed.

---

## Summary

The refactor is largely aligned with the target architecture: `jatosAccessService` is the use-case layer, `jatosClient` is transport-only, and `tokenBroker` handles tokens. The main gaps are:

- Several queries and actions still call the client directly instead of `jatosAccessService`.
- Admin-token fallbacks in `tokenBroker` weaken security.
- `checkJatosStudyExists` does not follow the client auth pattern.
- Some TypeScript and consistency issues remain.

The API import route is appropriately thin and delegates to provisioning. `uploadStudyFile` is a client-side transport adapter to that route and is acceptable.
