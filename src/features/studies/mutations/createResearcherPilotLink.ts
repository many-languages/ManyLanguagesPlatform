import { resolver } from "@blitzjs/rpc"
import { CreateResearcherPilotLinkSchema } from "@/src/features/studies/validations"
import { createResearcherPilotLink } from "../server/studySetupWrites"

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
