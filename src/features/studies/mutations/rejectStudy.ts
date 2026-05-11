"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { rejectStudy } from "../server/adminStudyWrites"

const RejectStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export default resolver.pipe(
  resolver.zod(RejectStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return rejectStudy(studyIds)
  }
)
