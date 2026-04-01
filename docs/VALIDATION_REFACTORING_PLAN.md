# Validation Refactoring Plan

Codebook and feedback template validation today persists `validationStatus`,
`validatedExtractionId`, `missingKeys`/`extraKeys` (codebook) and
`missingVariableNames`/`extraVariableNames` (feedback template) in the database.
These columns cache a trivially cheap set-difference computation and introduce
staleness risks when upstream data changes.

This plan moves the codebase toward on-demand validation and clearly separates
each validation layer's responsibility.

---

## 1. Privacy validation — current state and design decisions

**Conclusion:** The existing privacy enforcement is already well-structured
across three layers. No changes needed to step-completion flags.

### How privacy is enforced today

Privacy violations can arise in two directions:

1. **Template references a personal-data variable at edit time.**
   The client-side DSL validator (`dslValidator.ts`) receives `hiddenVariables`
   (personal-data flagged names) and flags any `{{ var:name }}` or
   `{{ stat:name.metric }}` that references them. The editor **blocks save**
   when DSL errors exist. This means a template can only enter the DB in a
   privacy-clean state through the normal UI.

2. **Codebook changes after the template was saved** (researcher marks a
   variable as personal data in Step 5 that the template already references).
   `updateVariableCodebook` already calls
   `getPersonalDataViolationsForPersistedTemplate` and returns
   `feedbackPersonalDataConflict`, which triggers a toast: _"Feedback may still
   reference variables you marked as personal—update Step 6 when ready."_

3. **Render-time hard-block** in `loadParticipantFeedbackViewModel` and
   `loadResearcherFeedbackViewModel` — blocks rendering when personal-data
   variables are referenced. Defense-in-depth safety net.

### Why privacy violations must NOT affect step-completion flags

`step6Completed` (and by extension `isSetupComplete`) gates a wide range of
downstream behavior:

- Participants see "not accepting participants" instead of the study
- Researcher overview hides JATOS data entirely
- Study activation is blocked
- Admin actions change (approve/reject/delete filtering)
- Dashboard counts shift, deadline cards show setup-incomplete badges
- Status scheduler behavior changes

Flipping `step6Completed = false` from a codebook save would treat a
**transitional editing state** as a hard failure. The researcher is mid-workflow
and will likely visit Step 6 next. The toast is the correct level of
intrusiveness for this scenario.

**Rule: only structural incompatibility (missing/extra variable keys) should
gate step completion. Privacy violations are soft warnings surfaced through
toasts and render-time blocks.**

### No additional privacy checks needed on template save

The client-side DSL validator already prevents saving a template that references
personal-data variables. A server-side duplicate in
`finalizeFeedbackTemplateAfterContentChange` would be redundant — the violating
state cannot be reached through the normal UI flow.

---

## 2. Extraction-approval validation — keep as-is

**Goal:** When extraction is re-approved, re-validate variable compatibility
for codebook and feedback template. This already works correctly.

### Current behavior (no changes needed)

`approveExtraction` already:

- Re-runs `validateCodebookAgainstExtraction` → resets `step5Completed` if
  `INVALID`.
- Re-runs `validateFeedbackTemplateAgainstExtraction` → resets
  `step6Completed` if `INVALID`.

Privacy is **not** re-evaluated here, and that is intentional per the rule
above: privacy violations are soft warnings, not step-completion gates. The
render-time hard-block remains the safety net.

---

## 3. Keep static render checks as defense-in-depth only

**Goal:** The render path (participant + researcher page loads) should not be
the primary enforcement layer. Keep existing checks but do not add new ones.

### Existing checks to keep

- **Privacy hard-block** in `loadParticipantFeedbackViewModel` and
  `loadResearcherFeedbackViewModel` — blocks rendering when personal-data
  variables are referenced. This is the last line of defense and must remain.
- **Rendering safeguards** — the template renderer already handles missing
  variables gracefully (renders placeholder or empty). No additional
  compatibility check is needed at this layer.

### What NOT to add here

- Variable name/key compatibility checks. The renderer already degrades
  gracefully for missing variables, and adding a DB query to diff variable
  sets on every page load adds latency without actionable benefit (participants
  cannot fix template mismatches).
- Syntax validation. If the template saved, it passed client-side syntax
  checks. Re-validating syntax at render time is redundant.

---

## 4. Move variable compatibility to on-demand computation

**Goal:** Remove persisted validation-status columns from `Codebook` and
`FeedbackTemplate`. Replace with pure functions that compute the same result
from existing DB rows at read time.

### Why

- The computation is a set difference of variable keys/names — trivially cheap.
- Persisted cache introduces staleness: if any upstream mutation forgets to
  re-validate, the UI shows stale status.
- Removes 4–5 columns per model and eliminates the `ValidatedExtraction`
  relation on both models.

### New pure functions

```ts
// codebook
async function computeCodebookValidation(studyId: number): Promise<{
  status: "VALID" | "INVALID" | "NO_CODEBOOK" | "NO_EXTRACTION"
  missingKeys: string[]
  extraKeys: string[]
}>

// feedback template
async function computeFeedbackTemplateValidation(studyId: number): Promise<{
  status: "VALID" | "INVALID" | "NO_TEMPLATE" | "NO_EXTRACTION"
  missingVariableNames: string[]
  extraVariableNames: string[]
}>
```

Each function:

1. Fetches the latest approved extraction snapshot ID from
   `jatosStudyUpload.approvedExtractionId`.
2. Fetches `StudyVariable` rows for that extraction.
3. Fetches codebook entry keys or parses template content for required variable
   names.
4. Returns the set difference — no DB writes.

### Call sites

- **Step 5 page (codebook):** `getCodebookDataRsc` → call
  `computeCodebookValidation` instead of reading persisted columns.
- **Step 6 page (feedback template):** step 6 RSC data loader → call
  `computeFeedbackTemplateValidation` instead of reading persisted columns.
- **`isSetupComplete` / step-completion logic:** if step completion currently
  reads `validationStatus` from the DB to determine `step5Completed` /
  `step6Completed`, replace with on-demand calls. Alternatively, keep
  `stepNCompleted` as a persisted flag (it's set by mutations, not read from
  validation columns) and treat the on-demand validation as UI-only.
- **`approveExtraction`:** still needs to evaluate compatibility to decide
  whether to reset `step5Completed` / `step6Completed`. Call the pure
  functions (they're read-only) and use the result to set step flags.

### Schema migration

Remove from `Codebook`:

- `validatedExtractionId`
- `validatedExtraction` (relation)
- `validationStatus`
- `validatedAt`
- `missingKeys`
- `extraKeys`
- `extractorVersion`

Remove from `FeedbackTemplate`:

- `validatedExtractionId`
- `validatedExtraction` (relation)
- `validationStatus`
- `validatedAt`
- `missingVariableNames`
- `extraVariableNames`
- `extractorVersion`

Keep on `FeedbackTemplate`:

- `requiredVariableNames` — used by the renderer to avoid re-parsing template
  content on every render. This is a genuine cache of a non-trivial parse
  (DSL extraction), unlike the set-difference validation.

### Migration order

1. Implement the two pure `compute*Validation` functions.
2. Update all read sites (Step 5 page, Step 6 page, setup-completion checks)
   to use the pure functions instead of persisted columns.
3. Update all write sites (`approveExtraction`, `updateVariableCodebook`,
   `finalizeFeedbackTemplateAfterContentChange`) to stop writing validation
   columns. Keep calling the pure functions where needed for step-completion
   flag decisions.
4. Remove `validateCodebookAgainstExtraction` and
   `validateFeedbackTemplateAgainstExtraction` (the DB-writing versions).
5. Remove the persisted columns via Prisma schema migration.
6. Remove `feedbackTemplateValidationResetFields` and any reset logic that
   nulls these columns on content change.

---

## Validation layer summary (target state)

| Layer                         | Checks                                                     | Blocks?                                                                           | Persisted?                 |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| **Client editor**             | DSL syntax + privacy (hidden variables)                    | Disables "Save" button                                                            | No                         |
| **On codebook save**          | Variable compatibility (on-demand); privacy toast warning  | Does not block save; sets `step5Completed` based on compatibility only            | Only step-completion flags |
| **On template save**          | Variable compatibility (on-demand)                         | Does not block save; sets `step6Completed` based on compatibility only            | Only step-completion flags |
| **On extraction approval**    | Variable compatibility (on-demand) for codebook + template | Does not block approval; resets step-completion flags based on compatibility only | Only step-completion flags |
| **Static render (page load)** | Privacy hard-block                                         | Blocks rendering for participants; shows warning for researchers                  | No                         |
| **Step 5 / Step 6 page RSC**  | Variable compatibility (on-demand)                         | Shows warning banner in UI                                                        | No (computed fresh)        |

### Key design rule

**Privacy violations are soft warnings — never step-completion gates.**
Only structural variable-key incompatibility (missing/extra keys vs extraction)
should affect `stepNCompleted` flags and `isSetupComplete`. Privacy is enforced
through client-side editor blocks (prevents saving), codebook-save toasts
(warns researcher), and render-time hard-blocks (defense-in-depth).
