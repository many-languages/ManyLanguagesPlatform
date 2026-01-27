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

function extractPilotMarkerToken(comment?: string): string | null {
  if (!isPilotComment(comment)) return null
  const token = comment.slice(PILOT_COMMENT_PREFIX.length)
  return token ? token : null
}

// Server-side helper to get all pilot results for a study
export const getAllPilotResultsRsc = cache(
  async (studyId: number): Promise<EnrichedJatosStudyResult[]> => {
    await verifyResearcherStudyAccess(studyId)

    const study = await db.study.findUnique({
      where: { id: studyId },
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
    const jatosStudyId = latestUpload?.jatosStudyId ?? null
    if (!jatosStudyId) throw new Error("Study does not have JATOS ID")
    const markerTokens = new Set(
      latestUpload?.pilotLinks.map((link) => link.markerToken).filter(Boolean) ?? []
    )
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
  }
)
