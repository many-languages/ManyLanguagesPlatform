import {
  ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE,
  studyArchivedBlocksSetupWrite,
} from "./studyEditability"

export const STUDY_ARCHIVE_REQUIRES_RESPONSES_MESSAGE =
  "This study cannot be archived because it has no participant responses. Delete the study instead if you no longer need it."

export const STUDY_DELETE_BLOCKED_BY_RESPONSES_MESSAGE =
  "This study cannot be deleted because it has participant responses. Archive the study instead."

export function assertStudyArchiveAllowedFromResponses(hasParticipantResponses: boolean): void {
  if (!hasParticipantResponses) {
    throw new Error(STUDY_ARCHIVE_REQUIRES_RESPONSES_MESSAGE)
  }
}

export function assertStudyDeleteAllowedFromResponses(hasParticipantResponses: boolean): void {
  if (hasParticipantResponses) {
    throw new Error(STUDY_DELETE_BLOCKED_BY_RESPONSES_MESSAGE)
  }
}

export function assertStudyNotArchivedState(study: { archived?: boolean | null }): void {
  if (studyArchivedBlocksSetupWrite(study)) {
    throw new Error(ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE)
  }
}
