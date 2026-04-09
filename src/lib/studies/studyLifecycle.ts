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
