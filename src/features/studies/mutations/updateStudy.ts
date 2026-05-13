import { resolver } from "@blitzjs/rpc"
import { UpdateStudy, UpdateStudyInput } from "@/src/features/studies/validations"
import { updateStudy } from "../server/studyDraftWrites"

export default resolver.pipe(
  resolver.zod(UpdateStudy),
  resolver.authorize("RESEARCHER"), // ensure user is at least a researcher
  async ({ id, ...data }: UpdateStudyInput) => {
    return updateStudy({ studyId: id, data })
  }
)
