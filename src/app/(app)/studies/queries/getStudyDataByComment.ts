import { getStudyDataByCommentForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { getBlitzContext } from "@/src/app/blitz-server"
import { resolver } from "@blitzjs/rpc"
import { cache } from "react"
import { z } from "zod"

export const GetStudyDataByCommentSchema = z.object({
  studyId: z.number().int().positive(),
  comment: z.string().default("test"),
})

// Server-side helper for RSCs
export const getStudyDataByCommentRsc = cache(async (studyId: number, comment: string = "test") => {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }
  return getStudyDataByCommentForResearcher({ studyId, userId, comment })
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyDataByCommentSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, comment }) => {
    return getStudyDataByCommentRsc(studyId, comment)
  }
)
