import { resolver } from "@blitzjs/rpc"
import { ArchiveStudy } from "@/src/features/studies/validations"
import { archiveStudy } from "../server/studyLifecycleWrites"

export default resolver.pipe(resolver.zod(ArchiveStudy), resolver.authorize(), async ({ id }) => {
  return archiveStudy(id)
})
