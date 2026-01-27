# JATOS Study Upload Refactor Map

Date: 2026-01-26

This document tracks the refactor needed after moving most JATOS-related fields from `Study` to `JatosStudyUpload`. The app must always use the **latest** upload, defined as the **max `JatosStudyUpload.createdAt`** for a given study.

## Goals

Executive summary: Align runtime behavior to the new schema while keeping current user flows intact.

- Ensure the app compiles and runs against the new schema.
- Always resolve **latest upload** and use it for any JATOS fields.
- Avoid functional changes beyond schema compatibility (for now).
- Support future ability to switch versions, but current code should always default to **latest**.

## Canonical Rule: Latest Upload

Executive summary: Every JATOS field must come from the most recent upload for a study.

Use one of these patterns everywhere:

```ts
const latestUpload = await db.jatosStudyUpload.findFirst({
  where: { studyId },
  orderBy: { createdAt: "desc" },
})
```

Or via `Study` include:

```ts
const study = await db.study.findUnique({
  where: { id: studyId },
  include: {
    jatosStudyUploads: { orderBy: { createdAt: "desc" }, take: 1 },
  },
})
const latestUpload = study?.jatosStudyUploads?.[0] ?? null
```

## Field Migration Summary

Executive summary: JATOS state lives on uploads; Study only keeps core study info.

### Moved to `JatosStudyUpload`

- `jatosStudyId`
- `jatosFileName`
- `jatosComponentId`
- `jatosComponentUUID`
- `jatosBatchId`
- `jatosWorkerType`
- `buildHash`
- `hashAlgorithm`
- `approvedExtractionId`
- `step1Completed`–`step6Completed`

### Removed / Replaced

Executive summary: Old study-scoped links and revision tracking are no longer valid.

- `StudyResearcher.jatosRunUrl` removed → use `PilotLink` keyed by `jatosStudyUploadId`.
- `PilotLink`, `PilotDatasetSnapshot`, `ExtractionSnapshot` now keyed by `jatosStudyUploadId`.
- `setupRevision` removed from schema but still referenced in code.

## High-Risk Schema Mismatches

Executive summary: These are the fastest paths to runtime errors if left unchanged.

These currently **do not match** the schema and must be resolved:

- `feedback` flow uses `setupRevision` and `extractionSnapshotId` (not in schema now).
- `approveExtraction` still references `setupRevision`, `studyId` on snapshots.
- `StudyResearcher.jatosRunUrl` is still read in `getStudy`.

## Required Refactor Areas

### 1) Core Study Fetching and Types

Executive summary: Centralize latest upload retrieval and expose it consistently in study data.

**Why:** Many components/queries still pull JATOS fields from `Study`.

**Files to update:**

- `src/app/(app)/studies/queries/getStudy.ts`
- `src/app/(admin)/admin/studies/queries/getAdminStudies.ts`

**Change:** include latest upload and expose a `latestUpload` object on returned data (or a helper to fetch it). Update `StudyWithRelations` usage accordingly.

---

### 2) Setup Completion + JATOS Fields

Executive summary: Setup state and import metadata must live on the latest upload.

**Why:** steps and JATOS import now live on `JatosStudyUpload`.

**Files to update:**

- `src/app/(app)/studies/[studyId]/setup/queries/getSetupCompletion.ts`
- `src/app/(app)/studies/[studyId]/setup/mutations/updateSetupCompletion.ts`
- `src/app/(app)/studies/mutations/updateStudy.ts` (step1)
- `src/app/(app)/studies/[studyId]/setup/mutations/importJatos.ts`
- `src/app/(app)/studies/mutations/updateStudyBatch.ts`
- `src/app/(app)/studies/mutations/updateStudyComponent.ts`
- `src/app/(app)/studies/mutations/clearJatosData.ts`

**Status:** partially complete.

**Implemented (2026-01-26):**

- `getSetupCompletion` now returns latest upload flags; if no upload exists, **step1Completed is derived** from Study fields and steps 2–6 are `false`.
- `updateSetupCompletion` now writes to **latest JatosStudyUpload** (error if none).
- `updateStudyBatch` now writes to **latest JatosStudyUpload** (error if none).
- `updateStudy` no longer writes `step1Completed` on Study.
- `importJatos` now creates a new `JatosStudyUpload` with `versionNumber`, `buildHash`, and **step1Completed derived from Study**.

**Remaining:**

- `updateStudyComponent`, `clearJatosData` still reference Study fields.
- Any other step-flag writers should be reviewed to ensure they update latest upload.

---

### 3) Pilot Links & Researcher Run URLs

Executive summary: Researcher run URLs must attach to the current upload version.

**Why:** `StudyResearcher.jatosRunUrl` is removed; use `PilotLink` keyed by upload.

**Files to update:**

- `src/app/(app)/studies/[studyId]/setup/mutations/saveResearcherJatosRunUrl.ts`
- `src/app/(app)/studies/[studyId]/setup/queries/getResearcherRunUrl.ts`
- `src/app/(app)/studies/[studyId]/utils/generateResearcherPilotRunUrl.ts`

**Change:** store and query by `jatosStudyUploadId` and use latest upload resolution.

---

### 4) Extraction + Codebook Flow

Executive summary: Extraction approval and codebook data must bind to the upload context.

**Why:** extraction snapshots are now tied to upload, not study.

**Files to update:**

- `src/app/(app)/studies/[studyId]/setup/mutations/approveExtraction.ts`
- `src/app/(app)/studies/[studyId]/variables/queries/getStudyVariables.ts`
- `src/app/(app)/studies/[studyId]/codebook/mutations/updateVariableCodebook.ts`

**Change:** use latest upload’s `approvedExtractionId` and `jatosStudyUploadId` for snapshot creation and lookups.

---

### 5) JATOS Metadata / Results Queries

Executive summary: All JATOS API calls must use the latest upload’s IDs.

**Why:** these use `study.jatosStudyId` and must now use latest upload’s `jatosStudyId`.

**Files to update:**

- `src/app/(app)/studies/queries/getStudyMetadata.ts`
- `src/app/(app)/studies/queries/getStudyDataByComment.ts`
- `src/app/(app)/studies/[studyId]/utils/getAllPilotResults.ts`
- `src/app/(app)/studies/[studyId]/utils/getPilotResultById.ts`
- `src/app/(app)/studies/[studyId]/debug/utils/getValidationData.ts`

---

### 6) UI / Component Fields

Executive summary: UI must read JATOS values from latest upload, not Study.

**Why:** UI currently expects JATOS fields on `Study`.

**Files to update:**

- `src/app/(app)/studies/components/client/StudyList.tsx`
- `src/app/(app)/studies/components/client/StudyItem.tsx`
- `src/app/(app)/studies/components/client/JoinStudyButton.tsx`
- `src/app/(app)/studies/[studyId]/components/client/StudyInformationCard.tsx`
- `src/app/(app)/studies/[studyId]/components/client/StudyComponentButton.tsx`
- `src/app/(app)/studies/[studyId]/components/client/StudyComponentModal.tsx`
- `src/app/(app)/studies/[studyId]/components/ResearcherData.tsx`
- `src/app/(app)/studies/[studyId]/components/ParticipantData.tsx`
- `src/app/(app)/studies/[studyId]/debug/components/client/StudyHeader.tsx`

---

### 7) Setup Step UI & Helpers

Executive summary: Step gating and progress must be derived from upload state.

**Files to update:**

- `src/app/(app)/studies/[studyId]/setup/utils/setupStatus.ts`
- `src/app/(app)/studies/[studyId]/setup/step2/components/client/Step2Content.tsx`
- `src/app/(app)/studies/[studyId]/setup/step3/components/client/Step3Content.tsx`
- `src/app/(app)/studies/[studyId]/setup/step3/components/client/Step3Actions.tsx`
- `src/app/(app)/studies/[studyId]/setup/step4/components/client/Step4Content.tsx`
- `src/app/(app)/studies/[studyId]/setup/step6/components/client/Step6Content.tsx`

**Status:** partially complete.

**Implemented (2026-01-26):**

- Step 2 flow now parses UUID from the `.jzip`, **blocks mismatched UUIDs**, and uses a **server preflight** before any upload.
- Step 2 update flow now shows a **"Update study" confirmation** when UUID matches the existing study, then imports.
- Old 409 conflict flow and delete/re-upload alert removed.

**Remaining:**

- Ensure all step UI reads step flags from `latestJatosStudyUpload` (some already updated).

---

## Feedback Template Mismatch (Needs Decision)

Executive summary: Feedback binding strategy must be chosen before implementation continues.

Schema now has:

- `FeedbackTemplate.validatedExtractionId`
- `FeedbackTemplate.validationStatus`
- `FeedbackTemplate.missingKeys`, `extraKeys`, `extractorVersion`

But code uses:

- `setupRevision`
- `extractionSnapshotId`

**Files impacted:**

- `src/app/(app)/studies/[studyId]/feedback/actions/saveFeedbackTemplate.ts`
- `src/app/(app)/studies/[studyId]/feedback/queries/getFeedbackTemplate.ts`
- `src/app/(app)/studies/[studyId]/feedback/mutations/createFeedbackTemplate.ts`
- `src/app/(app)/studies/[studyId]/feedback/mutations/updateFeedbackTemplate.ts`
- `src/app/(app)/studies/[studyId]/feedback/validations.ts`
- `src/app/(app)/studies/[studyId]/feedback/types.ts`

**Need a decision:**

- Should feedback template bind to `latestUpload.approvedExtractionId`?
- Or to `validatedExtractionId` only (schema suggests it)?
- What replaces `setupRevision` tracking?

## New Required Fields on Upload

Executive summary: Upload creation needs a version and a build hash, even in the interim.

`JatosStudyUpload` creation now **requires**:

- `versionNumber`
- `buildHash`

**Status:** implemented (2026-01-26).

- `buildHash` is computed server-side by unzipping the `.jzip` and hashing contents (sha256).
- `versionNumber` is incremented per study during upload creation.

Import flow must compute or derive these. If not available yet:

- Temporary plan: increment versionNumber per study, and compute `buildHash` from file contents (or use a placeholder until hashing pipeline is added).

---

## New Preflight Guards (Implemented)

Executive summary: avoid accidental overwrites by validating UUIDs before uploading to JATOS.

**Implemented (2026-01-26):**

- Client parses UUID from `.jzip` before upload using `extractJatosStudyUuidFromJzip`.
- Server resolver `checkJatosStudyUuid`:
  - rejects empty/invalid UUIDs,
  - blocks UUIDs already linked to another Study,
  - calls JATOS `/studies/{uuid}/properties` to gate:
    - **create**: fails if study exists on JATOS,
    - **update**: fails if study does not exist on JATOS.

**Files added/updated:**

- `src/lib/jatos/api/extractJatosStudyUuid.ts`
- `src/lib/jatos/api/checkJatosStudyExists.ts`
- `src/app/(app)/studies/[studyId]/setup/mutations/checkJatosStudyUuid.ts`
- `src/app/(app)/studies/[studyId]/setup/step2/components/client/Step2Content.tsx`

---

## Remaining Checklist

- Migrate `updateStudyComponent` to write `jatosComponentId` / `jatosComponentUUID` on latest upload. (to be handled separately, might be needed for new functionality later)
- Migrate `clearJatosData` to clear latest upload fields (and decide whether to keep `Study.jatosStudyUUID`). (I do not think we use this for anything, can be deleted?)
- Refactor pilot run URL storage to use `PilotLink` keyed by `jatosStudyUploadId`.
- Update extraction + codebook flows to bind to `jatosStudyUploadId` and `approvedExtractionId`.
- Update all remaining UI components to read JATOS fields from `latestJatosStudyUpload`.
- Resolve feedback template mismatch (`setupRevision`, `extractionSnapshotId` vs new schema fields).

## Suggested Work Plan (Threadable)

Executive summary: Split by dependency and schema risk so multiple threads can proceed safely.

### Thread A — Latest Upload Resolution

Executive summary: Establish the shared latest-upload lookup first.

- Add a helper and update `getStudy` / `getAdminStudies` to include `latestUpload`.
- Update any type definitions to include `latestUpload`.

### Thread B — Setup & JATOS Import

Executive summary: Move setup state and import writes onto uploads.

- Refactor `importJatos`, `updateSetupCompletion`, `updateStudyBatch`, `updateStudyComponent`, `clearJatosData`.
- Ensure step flags write to `JatosStudyUpload`.

### Thread C — Extraction + Codebook

Executive summary: Re-bind extraction snapshots and codebook ops to upload.

- Update `approveExtraction`, `getStudyVariables`, `updateVariableCodebook`.

### Thread D — Pilot Links / Run URLs

Executive summary: Ensure run URLs are version-aware and keyed by upload.

- Update `saveResearcherJatosRunUrl`, `getResearcherRunUrl`, `generateResearcherPilotRunUrl`.

### Thread E — UI Field Reads

Executive summary: Update UI props to use latest upload data.

- Update Study list, Study detail, setup flow to read latest upload.

### Thread F — Feedback Template Decision

Executive summary: Decide feedback linkage before changing implementation.

- Resolve new schema usage and update feedback flow accordingly.

## Notes / Risks

- Some fields (like `setupRevision`) appear removed and may require a design choice.
- `approvedExtractionId` should likely live on upload and be used as the source of truth.
- For admin logic (enable/disable data collection), ensure you check steps on latest upload, not study.
