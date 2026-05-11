"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { deleteStudy } from "../server/adminStudyWrites"

const DeleteStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
  reason: z.string().min(1, "Reason is required"),
})

export default resolver.pipe(
  resolver.zod(DeleteStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds, reason }) => {
    return deleteStudy({ studyIds, reason })
  }
)
