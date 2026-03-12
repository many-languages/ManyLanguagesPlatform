import { findStudyResultIdByComment } from "@/src/lib/jatos/api/findStudyResultIdByComment"
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { withStudyAccess } from "../[studyId]/utils/withStudyAccess"

export const GetStudyDataByCommentSchema = z.object({
  studyId: z.number().int().positive(),
  comment: z.string().default("test"),
})

// Server-side helper for RSCs
export const getStudyDataByCommentRsc = cache(async (studyId: number, comment: string = "test") => {
  return await withStudyAccess(studyId, async (_sId, _uId, token) => {
    const study = await db.study.findUnique({
      where: { id: studyId },
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
    const jatosStudyId = study.jatosStudyUploads[0]?.jatosStudyId ?? null
    if (!jatosStudyId) throw new Error("Study does not have JATOS ID")

    // 1) Metadata
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })

    // 2) Find matching result
    const studyResultId = findStudyResultIdByComment(metadata, comment)
    if (!studyResultId) throw new Error(`No result found with comment "${comment}"`)

    // 3) Get and parse raw data
    const { data: arrayBuffer } = await getResultsData({ studyResultIds: studyResultId }, { token })
    const blob = new Blob([arrayBuffer])
    const files = await parseJatosZip(blob)

    // 4) Enrich with metadata
    const enriched = matchJatosDataToMetadata(metadata, files)
    const result = enriched.find((r) => r.id === studyResultId)

    return { studyResultId, metadata, enrichedResult: result }
  })
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyDataByCommentSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, comment }) => {
    return getStudyDataByCommentRsc(studyId, comment)
  }
)
