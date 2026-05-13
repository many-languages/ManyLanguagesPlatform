import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { runExtraction } from "../server/studyExtractionWrites"

const RunExtraction = z.object({
  studyId: z.number(),
  includeDiagnostics: z.boolean().optional().default(true),
})

export default resolver.pipe(
  resolver.zod(RunExtraction),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return runExtraction(input)
  }
)
