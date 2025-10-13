import { getResultsData } from "@/src/app/jatos/utils/getResultsData"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"

export const GetStudyDataSchema = z.object({
  studyResultId: z.number().int().positive(),
})

export default resolver.pipe(
  resolver.zod(GetStudyDataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyResultId }, ctx) => {
    const { data } = await getResultsData({ studyResultIds: String(studyResultId) })
    return data // arrayBuffer, to be parsed server-side or in a follow-up query
  }
)
