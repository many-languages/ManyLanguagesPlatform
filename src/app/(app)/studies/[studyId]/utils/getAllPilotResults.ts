import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { cache } from "react"
import db from "db"
import type { EnrichedJatosStudyResult, JatosStudyResult } from "@/src/types/jatos"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"

const PILOT_COMMENT_PREFIX = "pilot:"

function isPilotComment(comment?: string) {
  return typeof comment === "string" && comment.startsWith(PILOT_COMMENT_PREFIX)
}

// Server-side helper to get all pilot results for a study
export const getAllPilotResultsRsc = cache(
  async (studyId: number): Promise<EnrichedJatosStudyResult[]> => {
    await verifyResearcherStudyAccess(studyId)

    const study = await db.study.findUnique({
      where: { id: studyId },
      select: { jatosStudyId: true },
    })
    if (!study) throw new Error("Study not found")

    // Get metadata
    const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

    // Filter for pilot results (comment starts with "pilot:")
    const pilotResults =
      metadata.data?.[0]?.studyResults?.filter((result: JatosStudyResult) =>
        isPilotComment(result.comment)
      ) || []

    if (pilotResults.length === 0) {
      return [] // No pilot results found
    }

    // Get IDs of pilot results
    const pilotResultIds = pilotResults.map((result: JatosStudyResult) => result.id).join(",")

    // Get and parse raw data
    const { data: arrayBuffer } = await getResultsData({ studyResultIds: pilotResultIds })
    const blob = new Blob([arrayBuffer])
    const files = await parseJatosZip(blob)

    // Enrich with metadata
    const allEnriched = matchJatosDataToMetadata(metadata, files)

    // Filter to only pilot results and sort by id (descending) to get latest first
    return allEnriched
      .filter((result: EnrichedJatosStudyResult) => isPilotComment(result.comment))
      .sort((a, b) => b.id - a.id) // Latest first (highest ID = newest)
  }
)
