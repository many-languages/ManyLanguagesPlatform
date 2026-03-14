import type { JatosMetadata, JatosMetadataStudy, JatosStudyResult } from "@/src/types/jatos"
import { extractPilotMarkerToken } from "./pilotComment"

/**
 * Pure utility function to check if pilot study is completed from metadata.
 * This function processes metadata and returns whether a completed pilot exists.
 *
 * @param metadata - JATOS results metadata response
 * @param jatosStudyUUID - The JATOS study UUID to check
 * @param markerTokens - Pilot marker tokens scoped to a specific upload
 * @returns true if a finished personal worker result exists for provided tokens, false otherwise
 */
export function checkPilotCompletionFromMetadata(
  metadata: JatosMetadata | null | undefined,
  jatosStudyUUID: string,
  markerTokens: Set<string>
): boolean {
  if (!metadata?.data) return false
  if (markerTokens.size === 0) return false

  return metadata.data.some((study: JatosMetadataStudy) => {
    if (study.studyUuid !== jatosStudyUUID) return false

    return study.studyResults?.some((result: JatosStudyResult) => {
      const isFinished = result.studyState === "FINISHED"
      const isPersonalWorker =
        result.workerType === "PersonalMultiple" || result.workerType === "PersonalSingle"
      const token = extractPilotMarkerToken(result.comment)
      const isPilot = token ? markerTokens.has(token) : false

      return isFinished && isPersonalWorker && isPilot
    })
  })
}
