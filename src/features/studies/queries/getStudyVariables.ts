import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getStudyVariablesRsc } from "../server/getStudyVariables"

const GetStudyVariables = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(GetStudyVariables),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return getStudyVariablesRsc(input.studyId)
  }
)
