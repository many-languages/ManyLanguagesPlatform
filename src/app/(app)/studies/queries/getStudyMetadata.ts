import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

export const GetStudyMetadataSchema = z.object({
  studyId: z.number().int().positive(),
})

export default resolver.pipe(
  resolver.zod(GetStudyMetadataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }, ctx) => {
    // 1) Get JATOS ID from your DB
    const study = await db.study.findFirst({
      where: { id: studyId },
      select: { jatosStudyId: true },
    })
    if (!study) throw new Error("Study not found")

    // 2) Fetch metadata from JATOS API
    const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

    return metadata
  }
)
