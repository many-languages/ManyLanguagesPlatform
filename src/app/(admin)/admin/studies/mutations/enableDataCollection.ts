"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const EnableDataCollectionSchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

const enableDataCollection = resolver.pipe(
  resolver.zod(EnableDataCollectionSchema),
  resolver.authorize("ADMIN"),
  async ({ studyIds }) => {
    const result = await db.study.updateMany({
      where: { id: { in: studyIds } },
      data: {
        status: "OPEN",
      },
    })

    return { updated: result.count }
  }
)

export default enableDataCollection
