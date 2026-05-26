// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { DisableDataCollectionSchema } from "@/src/features/studies/validations"
import { disableDataCollection } from "../server/adminStudyWrites"

export default resolver.pipe(
  resolver.zod(DisableDataCollectionSchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    return disableDataCollection(studyIds)
  }
)
