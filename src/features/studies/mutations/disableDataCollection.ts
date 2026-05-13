"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { disableDataCollection } from "../server/adminStudyWrites"

const DisableDataCollectionSchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export default resolver.pipe(
  resolver.zod(DisableDataCollectionSchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return disableDataCollection(studyIds)
  }
)
