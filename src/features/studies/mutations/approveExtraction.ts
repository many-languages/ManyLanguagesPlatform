import { resolver } from "@blitzjs/rpc"
import { ApproveExtractionSchema } from "@/src/features/studies/validations"
import { approveExtraction } from "../server/studyExtractionWrites"

export default resolver.pipe(
  resolver.zod(ApproveExtractionSchema),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return approveExtraction(input)
  }
)
