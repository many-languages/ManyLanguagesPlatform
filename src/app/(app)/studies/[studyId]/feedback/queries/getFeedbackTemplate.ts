import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { GetFeedbackTemplateSchema } from "../validations"
import { withStudyAccess } from "../../utils/withStudyAccess"

// Server-side helper for RSCs
export const getFeedbackTemplateRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async () => {
    // Get the most recent feedback template for this study
    // If you want to support multiple templates, you can return all of them
    const template = await db.feedbackTemplate.findFirst({
      where: { studyId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        content: true,
        extractorVersion: true,
        requiredVariableKeys: true,
        validatedExtractionId: true,
        validationStatus: true,
        validatedAt: true,
        missingKeys: true,
        extraKeys: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return template
  })
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getFeedbackTemplateRsc(studyId)
  }
)
