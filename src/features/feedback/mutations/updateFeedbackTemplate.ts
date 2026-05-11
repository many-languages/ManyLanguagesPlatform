import { resolver } from "@blitzjs/rpc"
import { UpdateFeedbackTemplateSchema } from "@/src/features/feedback/validations"
import { updateFeedbackTemplateRsc } from "../server/updateFeedbackTemplate"

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(UpdateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"),
  async ({ id, ...data }) => {
    return updateFeedbackTemplateRsc({ id, ...data })
  }
)
