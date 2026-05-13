import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getStudyMetadataRsc } from "../server/getStudyMetadata"

const GetStudyMetadataSchema = z.object({
  studyId: z.number().int().positive(),
})

export default resolver.pipe(
  resolver.zod(GetStudyMetadataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getStudyMetadataRsc(studyId)
  }
)
