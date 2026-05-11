import { resolver } from "@blitzjs/rpc"
import { CreateFeedbackTemplateSchema } from "@/src/features/feedback/validations"
import { createFeedbackTemplateRsc } from "../server/createFeedbackTemplate"

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(CreateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"), // only researchers can create
  async (input) => {
    return createFeedbackTemplateRsc(input)
  }
)
