"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { enableDataCollection } from "../server/adminStudyWrites"

const EnableDataCollectionSchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export default resolver.pipe(
  resolver.zod(EnableDataCollectionSchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return enableDataCollection(studyIds)
  }
)
