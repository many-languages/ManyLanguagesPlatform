import { resolver } from "@blitzjs/rpc"
import { RunExtractionSchema } from "@/src/features/studies/validations"
import { runExtraction } from "../server/studyExtractionWrites"

export default resolver.pipe(
  resolver.zod(RunExtractionSchema),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return runExtraction(input)
  }
)
