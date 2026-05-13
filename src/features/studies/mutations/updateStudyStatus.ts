import { resolver } from "@blitzjs/rpc"
import { UpdateStudyStatus } from "@/src/features/studies/validations"
import { updateStudyStatus } from "../server/studyLifecycleWrites"

export default resolver.pipe(
  resolver.zod(UpdateStudyStatus),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, status }) => {
    return updateStudyStatus({ studyId, status })
  }
)
