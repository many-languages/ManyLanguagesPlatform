/**
 * Pure study editability for researcher setup and related UI.
 * Server write enforcement uses assertStudyNotArchived / withStudyWriteAccess (see archived edit lock plan).
 *
 * Shared rule primitives here are the single definition of “archived blocks setup writes”; UI helpers
 * and assertStudyNotArchived compose them (see SETUP_WORKFLOW_STRUCTURE_REFACTOR_NOTES.md Problem 7).
 */

/** Shown when setup edit controls are disabled because the study is archived. */
export const ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE =
  "Archived studies cannot be edited. Unarchive the study first."

/**
 * Rule primitive: `true` when the study’s archived state blocks setup-related writes.
 * Keep this aligned with assertStudyNotArchived (studyLifecycle) after loading `{ archived }` from the DB.
 */
export function studyArchivedBlocksSetupWrite(study: { archived?: boolean | null }): boolean {
  return study.archived === true
}

/** Researchers may edit setup (and linked “Edit” entry points) when the study is not archived. */
export function canEditStudySetup(study: { archived?: boolean | null }): boolean {
  return !studyArchivedBlocksSetupWrite(study)
}
