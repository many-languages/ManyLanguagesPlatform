import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { checkJatosStudyUuid } from "../server/studySetupWrites"

const CheckJatosStudyUuid = z.object({
  studyId: z.number().int().positive(),
  jatosStudyUUID: z.string().min(1),
  mode: z.enum(["create", "update"]),
})

export default resolver.pipe(
  resolver.zod(CheckJatosStudyUuid),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, jatosStudyUUID, mode }) => {
    return checkJatosStudyUuid({ studyId, jatosStudyUUID, mode })
  }
)
