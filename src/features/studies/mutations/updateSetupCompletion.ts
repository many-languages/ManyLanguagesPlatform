import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { updateSetupCompletion } from "../server/studySetupWrites"

const UpdateSetupCompletion = z.object({
  studyId: z.number(),
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  step4Completed: z.boolean().optional(),
  step5Completed: z.boolean().optional(),
  step6Completed: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(UpdateSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return updateSetupCompletion(input)
  }
)
