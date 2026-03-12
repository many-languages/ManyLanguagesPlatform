"use server"

import { getParticipantPseudonymRsc } from "../../../queries/getParticipantPseudonym"
import { findStudyResultIdByComment } from "@/src/lib/jatos/api/findStudyResultIdByComment"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { getServiceAccountToken } from "@/src/lib/jatos/serviceAccount"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export async function fetchParticipantFeedbackAction(
  studyId: number,
  pseudonym: string,
  jatosStudyId: number
): Promise<{
  success: boolean
  completed: boolean
  data?: {
    enrichedResult: EnrichedJatosStudyResult | null
    allEnrichedResults: EnrichedJatosStudyResult[]
  }
  error?: string
}> {
  try {
    // Security check: Verify that the pseudonym belongs to the authenticated user
    const participant = await getParticipantPseudonymRsc(studyId)
    if (!participant) {
      return { success: false, completed: false, error: "Participant not found" }
    }
    if (participant.pseudonym !== pseudonym) {
      return {
        success: false,
        completed: false,
        error: "Pseudonym does not match authenticated user",
      }
    }

    const token = await getServiceAccountToken()

    // Get metadata to check if results exist
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })

    // Check if results exist for this participant's pseudonym
    const resultId = findStudyResultIdByComment(metadata, pseudonym)
    const completed = resultId !== null

    if (!completed) {
      // No results yet, return empty data
      return {
        success: true,
        completed: false,
        data: {
          enrichedResult: null,
          allEnrichedResults: [],
        },
      }
    }

    // Results exist, fetch the complete feedback data (participant flow uses service account token)
    let enrichedResult: EnrichedJatosStudyResult | null = null
    try {
      const { data: arrayBuffer } = await getResultsData({ studyResultIds: resultId }, { token })
      const blob = new Blob([arrayBuffer])
      const files = await parseJatosZip(blob)
      const enriched = matchJatosDataToMetadata(metadata, files)
      enrichedResult = enriched.find((r) => r.id === resultId) ?? null
    } catch (error) {
      // This shouldn't happen if resultId exists, but handle gracefully
      console.error("Error fetching enriched result:", error)
      return {
        success: false,
        completed: true,
        error: "Failed to fetch participant results",
      }
    }

    // Get all enriched results for "across" scope statistics
    const allResultsResult = await getResultsData({ studyIds: jatosStudyId }, { token })
    let allEnrichedResults: EnrichedJatosStudyResult[] = []

    if (allResultsResult.success) {
      const files = await parseJatosZip(allResultsResult.data)
      allEnrichedResults = matchJatosDataToMetadata(metadata, files)
    }

    return {
      success: true,
      completed: true,
      data: {
        enrichedResult,
        allEnrichedResults,
      },
    }
  } catch (error: any) {
    console.error("Error fetching participant feedback:", error)
    return {
      success: false,
      completed: false,
      error: error.message || "Failed to fetch participant feedback",
    }
  }
}
