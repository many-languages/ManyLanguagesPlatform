"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { approveStudy } from "../server/adminStudyWrites"

const ApproveStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export default resolver.pipe(
  resolver.zod(ApproveStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return approveStudy(studyIds)
  }
)
