import { logJatosError } from "../logger"
import {
  isJatosMappedError,
  mapJatosErrorToUserMessage,
  USER_MESSAGE_PARTICIPANT_FEEDBACK_ENRICHMENT_MISSING,
} from "../errors"
import { getResultsMetadata } from "../client/getResultsMetadata"
import {
  findLatestStudyResultSelectionByComment,
  findStudyResultIdByComment,
} from "../utils/findStudyResultIdByComment"
import { computeAggregatedAcrossStatsForTemplate } from "@/src/features/feedback/domain/computeAggregatedAcrossStats"
import { templateUsesStatAcross } from "@/src/features/feedback/domain/statAcrossKeys"
import {
  withParticipantViewerToken,
  assertJatosStudyIdsBelongToParticipant,
  fetchZipParseAndEnrich,
} from "./core"
import { getTokenForStudyService } from "../tokenBroker"
import type { GetParticipantFeedbackResult } from "../participantFeedbackTypes"
import type { JatosMetadata } from "@/src/types/jatos"

export async function getParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  participantStudyId,
  userId,
  templateContent,
  variableKeysAllowlist,
}: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  participantStudyId?: number
  userId: number
  templateContent: string
  variableKeysAllowlist?: string[]
}): Promise<GetParticipantFeedbackResult> {
  return withParticipantViewerToken(
    { studyId, pseudonym, userId, jatosStudyId, participantStudyId },
    async ({ jatosStudyId, pseudonym, token }) => {
      try {
        const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
        const { resultId, matchCount, selectedEndDate } = findLatestStudyResultSelectionByComment(
          metadata,
          pseudonym
        )

        if (resultId === null) {
          return { kind: "not_completed" }
        }

        const needsCohortForAcross = templateUsesStatAcross(templateContent)

        if (!needsCohortForAcross) {
          const enriched = await fetchZipParseAndEnrich({
            metadata,
            token,
            getResultsParams: { studyResultIds: resultId },
          })
          const enrichedResult = enriched.find((r) => r.id === resultId) ?? null
          if (!enrichedResult) {
            return {
              kind: "failed",
              error: USER_MESSAGE_PARTICIPANT_FEEDBACK_ENRICHMENT_MISSING,
            }
          }
          return {
            kind: "loaded",
            enrichedResult,
            matchingResponseCount: matchCount,
            selectedResponseEndDate: selectedEndDate,
          }
        }

        const allEnrichedResults = await fetchZipParseAndEnrich({
          metadata,
          token,
          getResultsParams: { studyIds: jatosStudyId },
        })
        const enrichedResult = allEnrichedResults.find((r) => r.id === resultId) ?? null
        if (!enrichedResult) {
          return {
            kind: "failed",
            error: USER_MESSAGE_PARTICIPANT_FEEDBACK_ENRICHMENT_MISSING,
          }
        }
        const aggregatedAcrossStats = computeAggregatedAcrossStatsForTemplate(
          allEnrichedResults,
          templateContent,
          variableKeysAllowlist
        )
        return {
          kind: "loaded",
          enrichedResult,
          aggregatedAcrossStats,
          matchingResponseCount: matchCount,
          selectedResponseEndDate: selectedEndDate,
        }
      } catch (error) {
        logJatosError("Error fetching enriched result for getParticipantFeedback", {
          operation: "getParticipantFeedback",
          error,
        })
        return { kind: "failed", error: mapJatosErrorToUserMessage(error) }
      }
    }
  )
}

export async function getResultsMetadataForParticipantDashboard({
  userId,
  jatosStudyIds,
}: {
  userId: number
  jatosStudyIds: number[]
}): Promise<JatosMetadata | null> {
  if (jatosStudyIds.length === 0) return null
  try {
    await assertJatosStudyIdsBelongToParticipant({ userId, jatosStudyIds })
    const token = await getTokenForStudyService(jatosStudyIds[0])
    return await getResultsMetadata({ studyIds: jatosStudyIds }, { token })
  } catch (error) {
    logJatosError("[getResultsMetadataForParticipantDashboard] JATOS metadata fetch failed", {
      operation: "getResultsMetadataForParticipantDashboard",
      userId,
      error,
    })
    return null
  }
}

export async function checkParticipantCompletionForParticipant({
  studyId,
  pseudonym,
  jatosStudyId,
  userId,
}: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  userId: number
}): Promise<{ success: boolean; completed: boolean; error?: string }> {
  try {
    return await withParticipantViewerToken(
      { studyId, pseudonym, userId, jatosStudyId },
      async ({ jatosStudyId, pseudonym, token }) => {
        const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
        const resultId = findStudyResultIdByComment(metadata, pseudonym)
        return { success: true, completed: resultId !== null }
      }
    )
  } catch (error) {
    if (!isJatosMappedError(error)) {
      console.error("[checkParticipantCompletionForParticipant]", {
        studyId,
        jatosStudyId,
        error,
      })
    }
    return {
      success: false,
      completed: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}
