import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { checkJatosStudyUuidForSetup } from "@/src/lib/jatos/jatosAccessService"

const CheckJatosStudyUuid = z.object({
  studyId: z.number().int().positive(),
  jatosStudyUUID: z.string().min(1),
  mode: z.enum(["create", "update"]),
})

export default resolver.pipe(
  resolver.zod(CheckJatosStudyUuid),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, jatosStudyUUID, mode }, ctx) => {
    const userId = ctx.session.userId!
    return checkJatosStudyUuidForSetup({
      studyId,
      userId,
      jatosStudyUuid: jatosStudyUUID,
      mode,
    })
  }
)
