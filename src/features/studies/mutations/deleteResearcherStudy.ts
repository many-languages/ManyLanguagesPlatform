import { resolver } from "@blitzjs/rpc"
import { DeleteStudy } from "@/src/features/studies/validations"
import { deleteResearcherStudy } from "../server/studyLifecycleWrites"

export default resolver.pipe(resolver.zod(DeleteStudy), resolver.authorize(), async ({ id }) => {
  return deleteResearcherStudy(id)
})
