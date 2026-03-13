import { cache } from "react"
import { getBlitzContext } from "@/src/app/blitz-server"
import {
  getResultsMetadataForResearcher,
  getStudyPropertiesForResearcher,
} from "@/src/lib/jatos/jatosAccessService"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import type {
  JatosMetadata,
  EnrichedJatosStudyResult,
  JatosStudyProperties,
} from "@/src/types/jatos"
import db from "db"

export interface ValidationData {
  metadata: JatosMetadata
  pilotResults: EnrichedJatosStudyResult[]
  properties: JatosStudyProperties
  study: {
    id: number
    jatosStudyUUID: string | null
    title: string
    latestJatosStudyUpload?: { jatosStudyId: number | null } | null
  }
  approvedExtraction?: {
    id: number
    pilotRunIds: number[] | null
    pilotDatasetHash: string | null
  } | null
}

/**
 * Fetch all data needed for the debug/validation page
 */
export const getValidationDataRsc = cache(async (studyId: number): Promise<ValidationData> => {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      id: true,
      jatosStudyUUID: true,
      title: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          jatosStudyId: true,
          approvedExtraction: {
            select: {
              id: true,
              pilotDatasetSnapshot: {
                select: {
                  pilotRunIds: true,
                  pilotDatasetHash: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  const latestUpload = study.jatosStudyUploads[0] ?? null
  const jatosStudyId = latestUpload?.jatosStudyId ?? null

  if (!jatosStudyId) {
    throw new Error("Study does not have a JATOS study ID")
  }

  if (!study.jatosStudyUUID) {
    throw new Error("Study does not have a JATOS study UUID")
  }

  const [metadata, pilotResults, properties] = await Promise.all([
    getResultsMetadataForResearcher({ studyId, userId, studyIds: [jatosStudyId] }),
    getAllPilotResultsRsc(studyId),
    getStudyPropertiesForResearcher({ studyId, userId, jatosStudyUUID: study.jatosStudyUUID }),
  ])

  return {
    metadata,
    pilotResults,
    properties,
    study: {
      id: study.id,
      jatosStudyUUID: study.jatosStudyUUID,
      title: study.title,
      latestJatosStudyUpload: latestUpload
        ? { jatosStudyId: latestUpload.jatosStudyId ?? null }
        : null,
    },
    approvedExtraction: latestUpload?.approvedExtraction
      ? {
          id: latestUpload.approvedExtraction.id,
          pilotRunIds: Array.isArray(
            latestUpload.approvedExtraction.pilotDatasetSnapshot?.pilotRunIds
          )
            ? (latestUpload.approvedExtraction.pilotDatasetSnapshot?.pilotRunIds as number[])
            : null,
          pilotDatasetHash:
            latestUpload.approvedExtraction.pilotDatasetSnapshot?.pilotDatasetHash ?? null,
        }
      : null,
  }
})
