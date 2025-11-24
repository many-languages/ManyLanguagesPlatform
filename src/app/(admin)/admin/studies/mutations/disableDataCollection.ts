"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const DisableDataCollectionSchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

const disableDataCollection = resolver.pipe(
  resolver.zod(DisableDataCollectionSchema),
  resolver.authorize("ADMIN"),
  async ({ studyIds }) => {
    const result = await db.study.updateMany({
      where: { id: { in: studyIds } },
      data: {
        status: "CLOSED",
      },
    })

    return { updated: result.count }
  }
)

export default disableDataCollection
