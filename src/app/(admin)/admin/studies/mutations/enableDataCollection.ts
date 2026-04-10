"use server"

import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { sendNotification } from "@/src/app/(app)/notifications/services/sendNotification"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"

const EnableDataCollectionSchema = z.object({
  studyIds: z.array(z.number()).min(1, "Select at least one study"),
})

const enableDataCollection = resolver.pipe(
  resolver.zod(EnableDataCollectionSchema),
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async ({ studyIds }) => {
    // Fetch studies with researchers and latest upload for validation
    const studies = await db.study.findMany({
      where: { id: { in: studyIds } },
      include: {
        researchers: { select: { userId: true } },
        jatosStudyUploads: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    const studiesWithLatestUpload = studies.map((s) => ({
      ...s,
      latestJatosStudyUpload: s.jatosStudyUploads[0] ?? null,
    }))

    // Validate: all must be admin approved and setup complete
    const invalidStudies = studiesWithLatestUpload.filter(
      (s) => s.adminApproved !== true || !isSetupComplete(s as StudyWithMinimalRelations)
    )
    if (invalidStudies.length > 0) {
      const titles = invalidStudies.map((s) => s.title?.trim() || `Study #${s.id}`).join(", ")
      throw new Error(
        `Cannot enable data collection. The following studies need admin approval and completed setup: ${titles}`
      )
    }

    const result = await db.study.updateMany({
      where: { id: { in: studyIds } },
      data: { status: "OPEN" },
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
            status: "enabled",
            changedAt,
          },
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

export default enableDataCollection
