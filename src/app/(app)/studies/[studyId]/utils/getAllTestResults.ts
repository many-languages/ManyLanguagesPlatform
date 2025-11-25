import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { cache } from "react"
import db from "db"
import type { EnrichedJatosStudyResult, JatosStudyResult } from "@/src/types/jatos"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"

// Server-side helper to get all test results for a study
export const getAllTestResultsRsc = cache(
  async (studyId: number): Promise<EnrichedJatosStudyResult[]> => {
    await verifyResearcherStudyAccess(studyId)

    const study = await db.study.findUnique({
      where: { id: studyId },
      select: { jatosStudyId: true },
    })
    if (!study) throw new Error("Study not found")

    // Get metadata
    const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

    // Filter for test results (comment === "test")
    const testResults =
      metadata.data?.[0]?.studyResults?.filter(
        (result: JatosStudyResult) => result.comment === "test"
      ) || []

    if (testResults.length === 0) {
      return [] // No test results found
    }

    // Get IDs of test results
    const testResultIds = testResults.map((result: JatosStudyResult) => result.id).join(",")

    // Get and parse raw data
    const { data: arrayBuffer } = await getResultsData({ studyResultIds: testResultIds })
    const blob = new Blob([arrayBuffer])
    const files = await parseJatosZip(blob)

    // Enrich with metadata
    const allEnriched = matchJatosDataToMetadata(metadata, files)

    // Filter to only test results and sort by id (descending) to get latest first
    return allEnriched
      .filter((result: EnrichedJatosStudyResult) => result.comment === "test")
      .sort((a, b) => b.id - a.id) // Latest first (highest ID = newest)
  }
)
