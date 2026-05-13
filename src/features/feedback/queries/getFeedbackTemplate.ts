import { resolver } from "@blitzjs/rpc"
import { GetFeedbackTemplateSchema } from "@/src/features/feedback/validations"
import { getFeedbackTemplateRsc } from "../server/getFeedbackTemplate"

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getFeedbackTemplateRsc(studyId)
  }
)
