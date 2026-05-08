import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getResultsMetadataForResearcher } from "@/src/lib/jatos/jatosAccessService"

export const GetStudyMetadataSchema = z.object({
  studyId: z.number().int().positive(),
})

// Server-side helper for RSCs
export const getStudyMetadataRsc = async (studyId: number) => {
  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    throw new Error("Not authenticated")
  }

  return getResultsMetadataForResearcher({ studyId, userId })
}

// Blitz RPC for client usage (with role check)
export default resolver.pipe(
  resolver.zod(GetStudyMetadataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getStudyMetadataRsc(studyId)
  }
)
