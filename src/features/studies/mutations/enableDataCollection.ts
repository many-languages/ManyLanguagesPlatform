"use server"

import { resolver } from "@blitzjs/rpc"
import { EnableDataCollectionSchema } from "@/src/features/studies/validations"
import { enableDataCollection } from "../server/adminStudyWrites"

export default resolver.pipe(
  resolver.zod(EnableDataCollectionSchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return enableDataCollection(studyIds)
  }
)
