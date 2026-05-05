import db from "db"
import {
  assertStudyArchiveAllowedFromResponses,
  assertStudyDeleteAllowedFromResponses,
  assertStudyNotArchivedState,
} from "../domain/studyLifecycle"
import { studyHasParticipantResponses } from "./participantResponses"

export async function assertStudyArchiveAllowed(studyId: number): Promise<void> {
  const has = await studyHasParticipantResponses(studyId)
  assertStudyArchiveAllowedFromResponses(has)
}

export async function assertStudyDeleteAllowedByResponses(studyId: number): Promise<void> {
  const has = await studyHasParticipantResponses(studyId)
  assertStudyDeleteAllowedFromResponses(has)
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
    assertStudyNotArchivedState(study)
    return
  }

  assertStudyNotArchivedState(studyOrId)
}
