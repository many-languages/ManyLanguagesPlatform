import { cache } from "react"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
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
    jatosStudyId: number | null
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
  await verifyResearcherStudyAccess(studyId)

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      id: true,
      jatosStudyUUID: true,
      title: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { jatosStudyId: true },
      },
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

  // Fetch metadata
  const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] })

  // Fetch pilot results (enriched with data)
  const pilotResults = await getAllPilotResultsRsc(studyId)

  // Fetch study properties
  const properties = await getStudyProperties(study.jatosStudyUUID)

  return {
    metadata,
    pilotResults,
    properties,
    study: {
      id: study.id,
      jatosStudyId,
      jatosStudyUUID: study.jatosStudyUUID,
      title: study.title,
      latestJatosStudyUpload: latestUpload
        ? { jatosStudyId: latestUpload.jatosStudyId ?? null }
        : null,
    },
    approvedExtraction: study.approvedExtraction
      ? {
          id: study.approvedExtraction.id,
          pilotRunIds: Array.isArray(study.approvedExtraction.pilotDatasetSnapshot?.pilotRunIds)
            ? (study.approvedExtraction.pilotDatasetSnapshot?.pilotRunIds as number[])
            : null,
          pilotDatasetHash: study.approvedExtraction.pilotDatasetSnapshot?.pilotDatasetHash ?? null,
        }
      : null,
  }
})
