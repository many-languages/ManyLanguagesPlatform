"use server"

import { resolver } from "@blitzjs/rpc"
import { AdminDeleteStudiesSchema } from "@/src/features/studies/validations"
import { deleteStudy } from "../server/adminStudyWrites"

export default resolver.pipe(
  resolver.zod(AdminDeleteStudiesSchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds, reason }) => {
    return deleteStudy({ studyIds, reason })
  }
)
