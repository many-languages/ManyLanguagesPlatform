"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { sendNotification } from "@/src/app/(app)/notifications/services/sendNotification"

const ApproveStudySchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export default resolver.pipe(
  resolver.zod(ApproveStudySchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    const session = await getAuthorizedSession()
    const now = new Date()

    const studies = await db.study.findMany({
      where: { id: { in: studyIds } },
      include: { researchers: { select: { userId: true } } },
    })

    const result = await db.study.updateMany({
      where: { id: { in: studyIds } },
      data: {
        adminApproved: true,
        adminReviewedAt: now,
        adminReviewedById: session.userId ?? undefined,
      },
    })

    const reviewedAt = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(now)

    for (const study of studies) {
      const researcherIds = study.researchers.map((r) => r.userId)
      if (researcherIds.length > 0) {
        await sendNotification({
          templateId: "adminStudyApproved",
          recipients: researcherIds,
          data: { studyTitle: study.title, reviewedAt },
          routeData: {
            path: "/studies/[studyId]",
            params: { studyId: study.id },
          },
          studyId: study.id,
        })
      }
    }

    return { updated: result.count }
  }
)
