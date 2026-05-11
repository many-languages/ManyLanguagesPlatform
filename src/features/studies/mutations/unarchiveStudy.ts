import { resolver } from "@blitzjs/rpc"
import { UnarchiveStudy } from "@/src/features/studies/validations"
import { unarchiveStudy } from "../server/studyLifecycleWrites"

export default resolver.pipe(resolver.authorize(), resolver.zod(UnarchiveStudy), async ({ id }) => {
  return unarchiveStudy(id)
})
