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
  properties: JatosStudyProperties
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

  if (!study.jatosStudyUUID) {
    throw new Error("Study does not have a JATOS study UUID")
  }

  // Fetch metadata
  const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

  // Fetch test results (enriched with data)
  const testResults = await getAllTestResultsRsc(studyId)

  // Fetch study properties
  const properties = await getStudyProperties(study.jatosStudyUUID)

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
