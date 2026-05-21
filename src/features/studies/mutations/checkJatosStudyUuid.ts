import { resolver } from "@blitzjs/rpc"
import { CheckJatosStudyUuidSchema } from "@/src/features/studies/validations"
import { checkJatosStudyUuid } from "../server/studySetupWrites"

export default resolver.pipe(
  resolver.zod(CheckJatosStudyUuidSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, jatosStudyUUID, mode }) => {
    return checkJatosStudyUuid({ studyId, jatosStudyUUID, mode })
  }
)
