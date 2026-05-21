// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { RejectStudySchema } from "@/src/features/studies/validations"
import { rejectStudy } from "../server/adminStudyWrites"

export default resolver.pipe(
  resolver.zod(RejectStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return rejectStudy(studyIds)
  }
)
