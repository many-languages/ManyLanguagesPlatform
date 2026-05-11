import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getResearcherRunUrlRsc } from "../server/getResearcherRunUrl"

const GetResearcherRunUrl = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(GetResearcherRunUrl),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getResearcherRunUrlRsc(studyId)
  }
)
