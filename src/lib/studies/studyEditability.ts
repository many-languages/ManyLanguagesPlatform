/**
 * Pure study editability for researcher setup and related UI.
 * Server write enforcement uses assertStudyNotArchived / withStudyWriteAccess (see archived edit lock plan).
 */

/** Shown when setup edit controls are disabled because the study is archived. */
export const ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE =
  "Archived studies cannot be edited. Unarchive the study first."

/** Researchers may edit setup (and linked “Edit” entry points) when the study is not archived. */
export function canEditStudySetup(study: { archived?: boolean | null }): boolean {
  return study.archived !== true
}
