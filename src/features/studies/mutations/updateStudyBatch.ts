import { resolver } from "@blitzjs/rpc"
import { UpdateStudyBatch } from "@/src/features/studies/validations"
import { updateStudyBatch } from "../server/studySetupWrites"

export default resolver.pipe(
  resolver.zod(UpdateStudyBatch),
  resolver.authorize(),
  async ({ studyId, jatosBatchId }) => {
    return updateStudyBatch({ studyId, jatosBatchId })
  }
)
