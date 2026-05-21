"use server"

import { resolver } from "@blitzjs/rpc"
import { ApproveStudySchema } from "@/src/features/studies/validations"
import { approveStudy } from "../server/adminStudyWrites"

export default resolver.pipe(
  resolver.zod(ApproveStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return approveStudy(studyIds)
  }
)
