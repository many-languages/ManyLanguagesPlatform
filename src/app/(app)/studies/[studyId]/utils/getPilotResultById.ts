import { cache } from "react"
import db from "db"
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import type { EnrichedJatosStudyResult, JatosStudyResult } from "@/src/types/jatos"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"
import { withStudyAccess } from "./withStudyAccess"

const PILOT_COMMENT_PREFIX = "pilot:"

function isPilotComment(comment?: string) {
  return typeof comment === "string" && comment.startsWith(PILOT_COMMENT_PREFIX)
}

// Server-side helper to fetch a specific pilot result by ID.
export const getPilotResultByIdRsc = cache(
  async (
    studyId: number,
    testResultId: number,
    jatosStudyIdContext?: number
  ): Promise<EnrichedJatosStudyResult> => {
    return await withStudyAccess(studyId, async (sId) => {
      let jatosStudyId = jatosStudyIdContext

      if (!jatosStudyId) {
        const study = await db.study.findUnique({
          where: { id: sId },
          select: {
            id: true,
            jatosStudyUploads: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { jatosStudyId: true },
            },
          },
        })
        if (!study) throw new Error("Study not found")
        jatosStudyId = study.jatosStudyUploads[0]?.jatosStudyId ?? undefined
      }

      if (!jatosStudyId) throw new Error("Study does not have JATOS ID")

      const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] })
      const testResult = metadata.data?.[0]?.studyResults?.find(
        (result: JatosStudyResult) => result.id === testResultId && isPilotComment(result.comment)
      )

      if (!testResult) {
        throw new Error("Pilot result not found")
      }

      const { data: arrayBuffer } = await getResultsData({ studyResultIds: String(testResultId) })
      const blob = new Blob([arrayBuffer])
      const files = await parseJatosZip(blob)
      const enriched = matchJatosDataToMetadata(metadata, files)
      const match = enriched.find((result) => result.id === testResultId)

      if (!match) {
        throw new Error("Failed to load pilot result data")
      }

      return match
    })
  }
)
