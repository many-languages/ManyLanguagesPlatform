import { resolver } from "@blitzjs/rpc"
import { UpdateSetupCompletionSchema } from "@/src/features/studies/validations"
import { updateSetupCompletion } from "../server/studySetupWrites"

export default resolver.pipe(
  resolver.zod(UpdateSetupCompletionSchema),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return updateSetupCompletion(input)
  }
)
