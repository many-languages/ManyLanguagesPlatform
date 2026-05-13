import { resolver } from "@blitzjs/rpc"
import { CreateStudy, CreateStudyInput } from "@/src/features/studies/validations"
import { createStudy } from "../server/studyDraftWrites"

export default resolver.pipe(
  resolver.zod(CreateStudy),
  resolver.authorize(),
  async (input: CreateStudyInput) => {
    return createStudy(input)
  }
)
