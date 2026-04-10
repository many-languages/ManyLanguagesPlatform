import db from "db"

import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "./studyEditability"
import { studyHasParticipantResponses } from "./participantResponses"

export async function assertStudyArchiveAllowed(studyId: number): Promise<void> {
  const has = await studyHasParticipantResponses(studyId)
  if (!has) {
    throw new Error(
      "This study cannot be archived because it has no participant responses. Delete the study instead if you no longer need it."
    )
  }
}

export async function assertStudyDeleteAllowedByResponses(studyId: number): Promise<void> {
  const has = await studyHasParticipantResponses(studyId)
  if (has) {
    throw new Error(
      "This study cannot be deleted because it has participant responses. Archive the study instead."
    )
  }
}

export async function assertStudyNotArchived(studyId: number): Promise<void>
export async function assertStudyNotArchived(study: { archived?: boolean | null }): Promise<void>
export async function assertStudyNotArchived(
  studyOrId: number | { archived?: boolean | null }
): Promise<void> {
  if (typeof studyOrId === "number") {
    const study = await db.study.findUnique({
      where: { id: studyOrId },
      select: { archived: true },
    })
    if (!study) {
      throw new Error("Study not found")
    }
    if (study.archived === true) {
      throw new Error(ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE)
    }
    return
  }
  if (studyOrId.archived === true) {
    throw new Error(ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE)
  }
}
