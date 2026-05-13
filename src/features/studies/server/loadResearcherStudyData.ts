import { getBlitzContext } from "@/src/app/blitz-server"
import {
  getEnrichedResultsForResearcher,
  getResultsMetadataForResearcher,
  getStudyPropertiesForResearcher,
} from "@/src/lib/jatos/jatosAccessService"
import { hasParticipantResponses as hasParticipantResponsesInResults } from "@/src/lib/jatos/utils/studyHasParticipantResponses"
import type {
  EnrichedJatosStudyResult,
  JatosMetadata,
  JatosStudyProperties,
} from "@/src/types/jatos"
import type { ParticipantWithEmail, StudyWithRelations } from "../types"
import { getStudyParticipantsRsc } from "./getStudyParticipants"

export type ResearcherStudyDataLoad =
  | { kind: "not_authenticated" }
  | { kind: "study_properties_failed" }
  | { kind: "unexpected_error" }
  | {
      kind: "loaded"
      isPi: boolean
      participants: ParticipantWithEmail[]
      metadata: JatosMetadata | null
      properties: JatosStudyProperties
      enrichedResults: EnrichedJatosStudyResult[]
      lifecycleHasResponses: boolean | null
    }

export async function loadResearcherStudyData(input: {
  studyId: number
  study: StudyWithRelations
  jatosStudyId: number
}): Promise<ResearcherStudyDataLoad> {
  const { studyId, study, jatosStudyId } = input
  const { session } = await getBlitzContext()
  const userId = session.userId

  if (userId == null) {
    return { kind: "not_authenticated" }
  }

  let participants: ParticipantWithEmail[] = []
  let metadata: JatosMetadata | null = null
  let properties: JatosStudyProperties | null = null
  let enrichedResults: EnrichedJatosStudyResult[] = []

  try {
    const [participantsResult, metadataResult, propertiesResult, enrichedResultsResult] =
      await Promise.allSettled([
        getStudyParticipantsRsc(studyId),
        getResultsMetadataForResearcher({
          studyId,
          userId,
          studyIds: [jatosStudyId],
        }),
        getStudyPropertiesForResearcher({
          studyId,
          userId,
          jatosStudyUUID: study.jatosStudyUUID ?? undefined,
        }),
        getEnrichedResultsForResearcher({ studyId, userId, jatosStudyId }),
      ])

    participants = participantsResult.status === "fulfilled" ? participantsResult.value : []
    metadata = metadataResult.status === "fulfilled" ? metadataResult.value : null
    properties = propertiesResult.status === "fulfilled" ? propertiesResult.value : null
    enrichedResults =
      enrichedResultsResult.status === "fulfilled" ? enrichedResultsResult.value : []

    if (participantsResult.status === "rejected") {
      console.error("Failed to fetch study participants", participantsResult.reason)
    }

    if (metadataResult.status === "rejected") {
      console.error("Failed to fetch results metadata", metadataResult.reason)
    }

    if (enrichedResultsResult.status === "rejected") {
      console.error("Failed to fetch enriched results", enrichedResultsResult.reason)
    }

    if (properties === null) {
      console.error(
        "Failed to fetch study properties",
        propertiesResult.status === "rejected" ? propertiesResult.reason : undefined
      )
      return { kind: "study_properties_failed" }
    }
  } catch (error) {
    console.error("Unexpected error fetching researcher study data:", error)
    return { kind: "unexpected_error" }
  }

  const jatosUuid = study.jatosStudyUUID?.trim()
  let lifecycleHasResponses: boolean | null = null
  if (metadata) {
    const entry =
      metadata.data?.find((d) => d.studyUuid === jatosUuid) ?? metadata.data?.[0] ?? null
    lifecycleHasResponses = entry
      ? hasParticipantResponsesInResults(entry.studyResults ?? [])
      : false
  }

  return {
    kind: "loaded",
    isPi: study.researchers.some(
      (researcher) => researcher.userId === userId && researcher.role === "PI"
    ),
    participants,
    metadata,
    properties,
    enrichedResults,
    lifecycleHasResponses,
  }
}
