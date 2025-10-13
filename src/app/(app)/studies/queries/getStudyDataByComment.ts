import { findStudyResultIdByComment } from "@/src/app/jatos/utils/findStudyResultIdByComment"
import { getResultsData } from "@/src/app/jatos/utils/getResultsData"
import { getResultsMetadata } from "@/src/app/jatos/utils/getResultsMetadata"
import { matchJatosDataToMetadata } from "@/src/app/jatos/utils/matchJatosDataToMetadata"
import { parseJatosZip } from "@/src/app/jatos/utils/parseJatosZip"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

export const GetStudyDataByCommentSchema = z.object({
  studyId: z.number().int().positive(),
  comment: z.string().default("test"),
})

export default resolver.pipe(
  resolver.zod(GetStudyDataByCommentSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, comment }, ctx) => {
    const study = await db.study.findUnique({
      where: { id: studyId },
      select: { jatosStudyId: true },
    })
    if (!study) throw new Error("Study not found")

    // 1) Metadata
    const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

    // 2) Find matching result
    const studyResultId = findStudyResultIdByComment(metadata, comment)
    if (!studyResultId) throw new Error(`No result found with comment "${comment}"`)

    // 3) Get and parse raw data
    const { data: arrayBuffer } = await getResultsData({ studyResultIds: String(studyResultId) })
    const blob = new Blob([arrayBuffer])
    const files = await parseJatosZip(blob)

    // 4) Enrich with metadata
    const enriched = matchJatosDataToMetadata(metadata, files)
    const result = enriched.find((r) => r.id === studyResultId)

    return { studyResultId, metadata, enrichedResult: result }
  }
)
