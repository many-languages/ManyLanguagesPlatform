import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { cache } from "react"
import db from "db"
import type { EnrichedJatosStudyResult, JatosStudyResult } from "@/src/types/jatos"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"
import { withStudyAccess } from "./withStudyAccess"

const PILOT_COMMENT_PREFIX = "pilot:"

function isPilotComment(comment?: string) {
  return typeof comment === "string" && comment.startsWith(PILOT_COMMENT_PREFIX)
}

function extractPilotMarkerToken(comment?: string): string | null {
  if (!isPilotComment(comment)) return null
  const token = comment.slice(PILOT_COMMENT_PREFIX.length)
  return token ? token : null
}

// Context optimization to skip DB lookups
export interface PilotResultsContext {
  jatosStudyId: number
  markerTokens: string[]
}

// Server-side helper to get all pilot results for a study
export const getAllPilotResultsRsc = cache(
  async (studyId: number, context?: PilotResultsContext): Promise<EnrichedJatosStudyResult[]> => {
    return await withStudyAccess(studyId, async (sId, uId) => {
      let jatosStudyId: number
      let markerTokens: Set<string>

      if (context) {
        // Use provided context
        jatosStudyId = context.jatosStudyId
        markerTokens = new Set(context.markerTokens)
      } else {
        // Fetch from DB
        const study = await db.study.findUnique({
          where: { id: sId },
          select: {
            id: true,
            jatosStudyUploads: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                jatosStudyId: true,
                pilotLinks: {
                  select: { markerToken: true },
                },
              },
            },
          },
        })
        if (!study) throw new Error("Study not found")
        const latestUpload = study.jatosStudyUploads[0] ?? null
        const foundJatosStudyId = latestUpload?.jatosStudyId ?? null
        if (!foundJatosStudyId) throw new Error("Study does not have JATOS ID")

        jatosStudyId = foundJatosStudyId
        markerTokens = new Set(
          latestUpload?.pilotLinks.map((link) => link.markerToken).filter(Boolean) ?? []
        )
      }
      if (markerTokens.size === 0) {
        return [] // No pilot links for this upload
      }

      // Get metadata
      const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] })

      // Filter for pilot results (comment starts with "pilot:")
      const pilotResults =
        metadata.data?.[0]?.studyResults?.filter((result: JatosStudyResult) => {
          const token = extractPilotMarkerToken(result.comment)
          return token ? markerTokens.has(token) : false
        }) || []

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
        .filter((result: EnrichedJatosStudyResult) => {
          const token = extractPilotMarkerToken(result.comment)
          return token ? markerTokens.has(token) : false
        })
        .sort((a, b) => b.id - a.id) // Latest first (highest ID = newest)
    })
  }
)
