"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { sendNotification } from "@/src/app/(app)/notifications/services/sendNotification"

const DisableDataCollectionSchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

const disableDataCollection = resolver.pipe(
  resolver.zod(DisableDataCollectionSchema),
  resolver.authorize("ADMIN"),
  async ({ studyIds }) => {
    // Fetch studies with their researchers before updating
    const studies = await db.study.findMany({
      where: { id: { in: studyIds } },
      include: {
        researchers: {
          select: { userId: true },
        },
      },
    })

    const result = await db.study.updateMany({
      where: { id: { in: studyIds } },
      data: {
        status: "CLOSED",
      },
    })

    // Send notifications to all researchers for each study
    const changedAt = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date())

    for (const study of studies) {
      const researcherIds = study.researchers.map((r) => r.userId)
      if (researcherIds.length > 0) {
        await sendNotification({
          templateId: "dataCollectionStatusChanged",
          recipients: researcherIds,
          data: {
            studyTitle: study.title,
            status: "disabled",
            changedAt,
          },
          routeData: {
            path: "/studies/[studyId]",
            params: { studyId: study.id },
          },
        })
      }
    }

    return { updated: result.count }
  }
)

export default disableDataCollection
