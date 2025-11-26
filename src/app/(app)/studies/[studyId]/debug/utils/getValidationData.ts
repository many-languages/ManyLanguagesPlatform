import { cache } from "react"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import { getAllTestResultsRsc } from "../../utils/getAllTestResults"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import type {
  JatosMetadata,
  EnrichedJatosStudyResult,
  JatosStudyProperties,
} from "@/src/types/jatos"
import db from "db"

export interface ValidationData {
  metadata: JatosMetadata
  testResults: EnrichedJatosStudyResult[]
  properties: JatosStudyProperties | null
  study: {
    id: number
    jatosStudyId: number | null
    jatosStudyUUID: string | null
    title: string
  }
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
      jatosStudyId: true,
      jatosStudyUUID: true,
      title: true,
    },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  if (!study.jatosStudyId) {
    throw new Error("Study does not have a JATOS study ID")
  }

  // Fetch metadata
  const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

  // Fetch test results (enriched with data)
  const testResults = await getAllTestResultsRsc(studyId)

  // Fetch study properties (if UUID is available)
  let properties: JatosStudyProperties | null = null
  if (study.jatosStudyUUID) {
    try {
      properties = await getStudyProperties(study.jatosStudyUUID)
    } catch (error) {
      console.error("Failed to fetch study properties:", error)
      // Continue without properties rather than failing the whole request
    }
  }

  return {
    metadata,
    testResults,
    properties,
    study: {
      id: study.id,
      jatosStudyId: study.jatosStudyId,
      jatosStudyUUID: study.jatosStudyUUID,
      title: study.title,
    },
  }
})
