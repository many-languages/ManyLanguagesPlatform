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
  JatosStudyResult,
} from "@/src/types/jatos"
import { calculateStudySummary } from "../domain/inspector/calculateStudySummary"
import type { StudySummaryResult } from "../domain/inspector/calculateStudySummary"
import type {
  ParticipantWithEmail,
  ResearcherParticipantStatusRow,
  ResearcherResultComponentOption,
  StudyWithRelations,
} from "../types"
import { getStudyParticipantsRsc } from "./getStudyParticipants"

export type ResearcherStudyDataLoad =
  | { kind: "not_authenticated" }
  | { kind: "study_properties_failed" }
  | { kind: "unexpected_error" }
  | {
      kind: "loaded"
      isPi: boolean
      participantRows: ResearcherParticipantStatusRow[]
      summary: StudySummaryResult | null
      resultComponents: ResearcherResultComponentOption[]
      rawResultInspectorPayload: ResearcherRawResultInspectorPayload
      hasResults: boolean
      lifecycleHasResponses: boolean | null
    }

export type ResearcherRawResultInspectorPayload = {
  /**
   * Raw participant JATOS result data for the authorized researcher results card.
   * Keep this payload out of summary/participant-management DTOs.
   */
  enrichedResults: EnrichedJatosStudyResult[]
}

function getStudyResultsForStudy(metadata: JatosMetadata | null, studyUuid?: string | null) {
  const normalizedStudyUuid = studyUuid?.trim()
  const study =
    metadata?.data?.find((entry) => entry.studyUuid === normalizedStudyUuid) ??
    metadata?.data?.[0] ??
    null

  return study?.studyResults ?? []
}

function toParticipantStatusRows(
  participants: ParticipantWithEmail[],
  studyResults: JatosStudyResult[]
): ResearcherParticipantStatusRow[] {
  return participants.map((participant) => {
    const jatosResult = studyResults.find(
      (result) =>
        result.comment === participant.pseudonym || result.comment === participant.user.email
    )

    const componentResults = jatosResult?.componentResults ?? []
    const finishedComponents = componentResults.filter(
      (component) => component.componentState === "FINISHED"
    ).length
    const totalComponents = componentResults.length || 1
    const progress = Math.round((finishedComponents / totalComponents) * 100)

    return {
      id: participant.id,
      label: participant.user.email,
      finished: jatosResult?.studyState === "FINISHED",
      lastSeen: jatosResult?.lastSeenDate
        ? new Date(jatosResult.lastSeenDate).toLocaleString()
        : "-",
      active: participant.active,
      progress,
      duration: jatosResult?.duration ?? "-",
      payed: participant.payed,
    }
  })
}

function toResultComponentOptions(
  properties: JatosStudyProperties
): ResearcherResultComponentOption[] {
  return (
    properties.components?.map((component) => ({
      uuid: component.uuid,
      title: component.title,
    })) ?? []
  )
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

  const studyResults = getStudyResultsForStudy(metadata, study.jatosStudyUUID)
  let lifecycleHasResponses: boolean | null = null
  if (metadata) {
    lifecycleHasResponses = hasParticipantResponsesInResults(studyResults)
  }

  let summary: StudySummaryResult | null = null
  if (metadata) {
    try {
      summary = calculateStudySummary(metadata)
    } catch (error) {
      console.error("Failed to calculate study summary", error)
    }
  }

  return {
    kind: "loaded",
    isPi: study.researchers.some(
      (researcher) => researcher.userId === userId && researcher.role === "PI"
    ),
    participantRows: toParticipantStatusRows(participants, studyResults),
    summary,
    resultComponents: toResultComponentOptions(properties),
    rawResultInspectorPayload: { enrichedResults },
    hasResults: studyResults.length > 0 || enrichedResults.length > 0,
    lifecycleHasResponses,
  }
}
