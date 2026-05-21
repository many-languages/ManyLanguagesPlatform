import db from "db"
import { getResultsMetadata } from "../client/getResultsMetadata"
import { checkPilotCompletionFromMetadata } from "../utils/checkPilotCompletion"
import { extractPilotMarkerToken, isPilotComment } from "../utils/pilotComment"
import { getTokenForResearcher } from "../tokenBroker"
import {
  withResearcherAccess,
  assertJatosStudyBelongsToStudy,
  assertJatosStudyUuidBelongsToStudy,
  assertJatosUploadBelongsToStudy,
  getStudyJatosInfo,
  fetchZipParseAndEnrich,
} from "./core"
import type { EnrichedJatosStudyResult, JatosStudyResult } from "@/src/types/jatos"

export interface PilotResultsContext {
  jatosStudyId: number
  markerTokens: string[]
}

export async function getAllPilotResultsForResearcher({
  studyId,
  userId,
  context,
}: {
  studyId: number
  userId: number
  context?: PilotResultsContext
}): Promise<EnrichedJatosStudyResult[]> {
  return withResearcherAccess({ studyId, userId }, async ({ studyId, userId }) => {
    let jatosStudyId: number
    let markerTokens: Set<string>

    if (context) {
      jatosStudyId = context.jatosStudyId
      await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
      markerTokens = new Set(context.markerTokens)
    } else {
      const study = await db.study.findUnique({
        where: { id: studyId },
        select: {
          jatosStudyUploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              jatosStudyId: true,
              pilotLinks: { select: { markerToken: true } },
            },
          },
        },
      })
      const latestUpload = study?.jatosStudyUploads[0] ?? null
      const foundJatosStudyId = latestUpload?.jatosStudyId ?? null
      if (!foundJatosStudyId) throw new Error("Study does not have JATOS ID")
      jatosStudyId = foundJatosStudyId
      markerTokens = new Set(
        latestUpload?.pilotLinks.map((l) => l.markerToken).filter(Boolean) ?? []
      )
    }

    if (markerTokens.size === 0) return []

    const token = await getTokenForResearcher(userId)
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
    const pilotResults =
      metadata.data?.[0]?.studyResults?.filter((result: JatosStudyResult) => {
        const markerToken = extractPilotMarkerToken(result.comment)
        return markerToken ? markerTokens.has(markerToken) : false
      }) || []

    if (pilotResults.length === 0) return []

    const pilotResultIds = pilotResults.map((r: JatosStudyResult) => r.id)
    const allEnriched = await fetchZipParseAndEnrich({
      metadata,
      token,
      getResultsParams: { studyResultIds: pilotResultIds },
    })

    return allEnriched
      .filter((r) => {
        const markerToken = extractPilotMarkerToken(r.comment)
        return markerToken ? markerTokens.has(markerToken) : false
      })
      .sort((a, b) => b.id - a.id)
  })
}

export async function getPilotResultByIdForResearcher({
  studyId,
  userId,
  testResultId,
  jatosStudyIdContext,
}: {
  studyId: number
  userId: number
  testResultId: number
  jatosStudyIdContext?: number
}): Promise<EnrichedJatosStudyResult> {
  return withResearcherAccess({ studyId, userId }, async ({ studyId, userId }) => {
    let jatosStudyId = jatosStudyIdContext
    if (!jatosStudyId) {
      const info = await getStudyJatosInfo(studyId)
      if (!info) throw new Error("Study does not have JATOS ID")
      jatosStudyId = info.jatosStudyId
    } else {
      await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    }

    const token = await getTokenForResearcher(userId)
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
    const testResult = metadata.data?.[0]?.studyResults?.find(
      (r: JatosStudyResult) => r.id === testResultId && isPilotComment(r.comment)
    )
    if (!testResult) throw new Error("Pilot result not found")

    const enriched = await fetchZipParseAndEnrich({
      metadata,
      token,
      getResultsParams: { studyResultIds: testResultId },
    })
    const match = enriched.find((r) => r.id === testResultId)
    if (!match) throw new Error("Failed to load pilot result data")

    return match
  })
}

export async function checkPilotStatusForResearcher({
  studyId,
  userId,
  jatosStudyUUID,
  jatosStudyUploadId,
}: {
  studyId: number
  userId: number
  jatosStudyUUID: string
  jatosStudyUploadId: number
}): Promise<{ success: boolean; completed: boolean | null; error?: string }> {
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    await assertJatosStudyUuidBelongsToStudy({ studyId, jatosStudyUUID })
    await assertJatosUploadBelongsToStudy({ studyId, jatosStudyUploadId })
    const token = await getTokenForResearcher(userId)
    const pilotLinks = await db.pilotLink.findMany({
      where: { jatosStudyUploadId },
      select: { markerToken: true },
    })
    const markerTokens = new Set(pilotLinks.map((l) => l.markerToken))
    if (markerTokens.size === 0) {
      return { success: true, completed: false }
    }

    const metadata = await getResultsMetadata({ studyUuids: [jatosStudyUUID] }, { token })

    const completed = checkPilotCompletionFromMetadata(metadata, jatosStudyUUID, markerTokens)
    return { success: true, completed }
  })
}
