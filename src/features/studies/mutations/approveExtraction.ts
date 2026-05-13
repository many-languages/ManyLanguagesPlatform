import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { approveExtraction } from "../server/studyExtractionWrites"

const ApproveExtraction = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(ApproveExtraction),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return approveExtraction(input)
  }
)
