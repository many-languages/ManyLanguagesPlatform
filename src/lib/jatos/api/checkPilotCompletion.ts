/**
 * Pure utility function to check if pilot study is completed from metadata.
 * This function processes metadata and returns whether a completed pilot exists.
 *
 * @param metadata - JATOS results metadata response
 * @param jatosStudyUUID - The JATOS study UUID to check
 * @returns true if a finished personal worker result exists, false otherwise
 */
const PILOT_COMMENT_PREFIX = "pilot:"

export function checkPilotCompletionFromMetadata(metadata: any, jatosStudyUUID: string): boolean {
  if (!metadata?.data) return false

  return metadata.data.some((study: any) => {
    if (study.studyUuid !== jatosStudyUUID) return false

    return study.studyResults?.some((result: any) => {
      const isFinished = result.studyState === "FINISHED"
      const isPersonalWorker =
        result.workerType === "PersonalMultiple" || result.workerType === "PersonalSingle"
      const isPilot =
        typeof result.comment === "string" && result.comment.startsWith(PILOT_COMMENT_PREFIX)

      return isFinished && isPersonalWorker && isPilot
    })
  })
}
