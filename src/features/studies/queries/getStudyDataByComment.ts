import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getStudyDataByCommentRsc } from "../server/getStudyDataByComment"

const GetStudyDataByCommentSchema = z.object({
  studyId: z.number().int().positive(),
  comment: z.string().default("test"),
})

export default resolver.pipe(
  resolver.zod(GetStudyDataByCommentSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, comment }) => {
    return getStudyDataByCommentRsc(studyId, comment)
  }
)
