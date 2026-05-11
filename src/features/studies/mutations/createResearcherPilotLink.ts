import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { createResearcherPilotLink } from "../server/studySetupWrites"

const CreateResearcherPilotLinkSchema = z.object({
  studyId: z.number(), // Added to support withStudyAccess
  studyResearcherId: z.number(),
  jatosStudyUploadId: z.number(),
  jatosRunUrl: z.string(),
  markerToken: z.string(),
})

export default resolver.pipe(
  resolver.zod(CreateResearcherPilotLinkSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, studyResearcherId, jatosStudyUploadId, jatosRunUrl, markerToken }) => {
    return createResearcherPilotLink({
      studyId,
      studyResearcherId,
      jatosStudyUploadId,
      jatosRunUrl,
      markerToken,
    })
  }
)
