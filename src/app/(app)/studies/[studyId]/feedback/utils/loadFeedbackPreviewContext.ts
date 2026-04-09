import db from "db"
import { withStudyAccess } from "../../utils/withStudyAccess"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import { getCodebookDataRsc } from "../../codebook/queries/getCodebookData"
import {
  hashPilotResultIds,
  putFeedbackPreviewContext,
  type StoredFeedbackPreviewContext,
} from "@/src/lib/feedback/previewContextStore"
import type { FeedbackVariable } from "../types"

export type FeedbackPreviewContextClientDto = {
  pilotResultCount: number
  primaryPilotResultId: number | null
  pilotResultIds: number[]
  previewContextVersion: string
  hasPilotData: boolean
  variables: FeedbackVariable[]
  hiddenVariables: string[]
}

export type LoadFeedbackPreviewContextResult =
  | { kind: "ok"; contextKey: string; client: FeedbackPreviewContextClientDto }
  | { kind: "error"; message: string }

/**
 * Loads pilot enrichment + codebook allowlists once per Step 6 visit, stores server-side context,
 * and returns a key plus UI-safe metadata for the client (no enriched JATOS payloads).
 */
export async function loadFeedbackPreviewContext(
  studyId: number
): Promise<LoadFeedbackPreviewContextResult> {
  try {
    return await withStudyAccess(studyId, async (sid, userId) => {
      const study = await db.study.findUnique({
        where: { id: sid },
        select: {
          jatosStudyUploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              jatosStudyId: true,
              pilotLinks: { select: { markerToken: true } },
            },
          },
        },
      })

      const latestUpload = study?.jatosStudyUploads[0] ?? null
      const latestJatosStudyUploadId = latestUpload?.id ?? 0
      const jatosStudyId = latestUpload?.jatosStudyId ?? null
      const markerTokens = latestUpload?.pilotLinks.map((l) => l.markerToken).filter(Boolean) ?? []

      const allPilotResults =
        jatosStudyId && markerTokens.length > 0
          ? await getAllPilotResultsRsc(sid, {
              jatosStudyId,
              markerTokens: markerTokens as string[],
            })
          : []

      const { variables, approvedExtractionId } = await getCodebookDataRsc(sid)

      const allowedVariableNames = variables
        .filter((v) => !v.personalData)
        .map((v) => v.variableName)
      const hiddenVariableNames = variables.filter((v) => v.personalData).map((v) => v.variableName)

      const pilotResultIds = allPilotResults.map((r) => r.id)
      const pilotDatasetHash = hashPilotResultIds(pilotResultIds)
      const primaryPilotResultId = allPilotResults[0]?.id ?? null

      const previewContextVersion = `${latestJatosStudyUploadId}-${
        approvedExtractionId ?? "none"
      }-${pilotDatasetHash.slice(0, 16)}`

      const client: FeedbackPreviewContextClientDto = {
        pilotResultCount: allPilotResults.length,
        primaryPilotResultId,
        pilotResultIds,
        previewContextVersion,
        hasPilotData: allPilotResults.length > 0,
        variables: variables
          .filter((v) => !v.personalData)
          .map((v) => ({
            variableName: v.variableName,
            type: v.type,
            variableKey: v.variableKey,
          })),
        hiddenVariables: hiddenVariableNames,
      }

      if (allPilotResults.length === 0) {
        return { kind: "ok" as const, contextKey: "", client }
      }

      const stored: StoredFeedbackPreviewContext = {
        studyId: sid,
        userId,
        latestJatosStudyUploadId,
        approvedExtractionId,
        pilotDatasetHash,
        previewContextVersion,
        primaryPilotResultId,
        pilotResultIds,
        pilotResultCount: allPilotResults.length,
        allowedVariableNames,
        hiddenVariableNames,
        allPilotResults,
      }

      const contextKey = putFeedbackPreviewContext(stored)

      return { kind: "ok" as const, contextKey, client }
    })
  } catch (e) {
    console.error("loadFeedbackPreviewContext", e)
    return {
      kind: "error",
      message: e instanceof Error ? e.message : "Could not load preview context.",
    }
  }
}
